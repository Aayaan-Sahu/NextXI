import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import {
  CoachStatus,
  PlayerStatus,
  PlayerVideoStatus,
  Visibility,
} from "@/app/generated/prisma/enums";
import { ReportPanel } from "@/components/report-panel";
import { Chip, PageShell, PageTitle } from "@/components/ui";
import { CommentForm, VideoComments } from "@/components/video-comments";
import { getProfile, requireUser } from "@/lib/auth";
import { hasAcceptedConnection } from "@/lib/connections";
import { prisma } from "@/lib/prisma";
import { getDerivedMeasurements } from "@/lib/report-history";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatVideoSize, formatVideoTags } from "@/lib/videos";
import { getVideoReport } from "@/lib/videos.server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export default async function CoachVideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ videoId: string }>;
  searchParams: Promise<{ commentError?: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "coach") redirect("/dashboard/player");
  if (profile.coach.status !== CoachStatus.APPROVED) redirect("/dashboard/coach");

  const [{ videoId }, { commentError }] = await Promise.all([params, searchParams]);

  if (!isUuid(videoId)) notFound();

  const video = await prisma.playerVideo.findFirst({
    where: {
      id: videoId,
      status: PlayerVideoStatus.READY,
    },
    select: {
      category: true,
      createdAt: true,
      handedness: true,
      originalFilename: true,
      playerId: true,
      sessionId: true,
      sizeBytes: true,
      storageBucket: true,
      storagePath: true,
      uploadedAt: true,
      variation: true,
      player: { select: { name: true, status: true, visibility: true } },
    },
  });

  if (!video) notFound();

  // Same gate as the coach player page: connected coaches can always watch;
  // otherwise the player must have opted into discovery (PUBLIC) and be active.
  const connected = await hasAcceptedConnection(user.id, video.playerId);
  const viewable =
    connected ||
    (video.player.visibility === Visibility.PUBLIC &&
      video.player.status === PlayerStatus.ACTIVE);

  if (!viewable) notFound();

  // Return to the session when the video was reached through one. A coach who
  // isn't connected got here from the player's page, so return there instead —
  // the session page is connection-gated.
  const backHref = connected
    ? video.sessionId
      ? `/dashboard/coach/sessions/${video.sessionId}`
      : "/dashboard/coach"
    : `/dashboard/coach/players/${video.playerId}`;
  const backLabel = !connected
    ? "Back to player"
    : video.sessionId
      ? "Back to session"
      : "All videos";

  // Opening the video marks it viewed, dropping it from the coach's dashboard.
  // Only for connected coaches: the review queue lists connected players'
  // videos, and a pre-connection look should still read as new once connected.
  if (connected) {
    await prisma.videoView.upsert({
      where: { videoId_viewerId: { videoId, viewerId: user.id } },
      update: {},
      create: { videoId, viewerId: user.id },
    });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(video.storageBucket)
    .createSignedUrl(video.storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error("Could not create a playback link for this video.");
  }

  const [comments, report] = await Promise.all([
    prisma.videoComment.findMany({
      where: { videoId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        authorName: true,
        authorUsername: true,
        body: true,
        createdAt: true,
      },
    }),
    getVideoReport(videoId),
  ]);

  // Value + own-range + last-session rows for the report, from prior reports.
  const derived = await getDerivedMeasurements(video, report);

  const uploadedAt = (video.uploadedAt ?? video.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <PageShell>
      <Link
        className="inline-block text-ui font-semibold text-rust-600 no-underline hover:text-rust-700"
        href={backHref}
      >
        ← {backLabel}
      </Link>
      <header className="mt-3.5 mb-6 flex items-start justify-between gap-6 max-md:flex-col">
        <div className="min-w-0">
          <PageTitle>{video.originalFilename}</PageTitle>
          <p className="mt-1.5 text-ui text-ink-600">
            {video.player.name} · Uploaded {uploadedAt} · {formatVideoSize(video.sizeBytes)}
          </p>
        </div>
        <Chip>{formatVideoTags(video.category, video.variation, video.handedness)}</Chip>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-8">
          <video
            className="aspect-video w-full rounded-lg bg-olive-950"
            controls
            preload="metadata"
            src={data.signedUrl}
          />
          {/* Feedback stays connection-gated (the action re-checks server-side). */}
          <VideoComments
            comments={comments}
            form={connected ? <CommentForm error={commentError} videoId={videoId} /> : undefined}
          />
        </div>
        {/* `derived` is the platform-side measurement rows (payload + the
            player's report history); the panel renders fine without it. */}
        <ReportPanel derived={derived} report={report} />
      </div>
    </PageShell>
  );
}

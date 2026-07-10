import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import { CoachStatus, PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { ReportPanel } from "@/components/report-panel";
import { PageShell } from "@/components/ui";
import { CommentForm, VideoComments } from "@/components/video-comments";
import { getProfile, requireUser } from "@/lib/auth";
import { hasAcceptedConnection } from "@/lib/connections";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatVideoSize } from "@/lib/videos";
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
      createdAt: true,
      originalFilename: true,
      playerId: true,
      sizeBytes: true,
      storageBucket: true,
      storagePath: true,
      uploadedAt: true,
      player: { select: { name: true } },
    },
  });

  if (!video || !(await hasAcceptedConnection(user.id, video.playerId))) notFound();

  // Opening the video marks it viewed, dropping it from the coach's dashboard.
  await prisma.videoView.upsert({
    where: { videoId_viewerId: { videoId, viewerId: user.id } },
    update: {},
    create: { videoId, viewerId: user.id },
  });

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

  const uploadedAt = (video.uploadedAt ?? video.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <PageShell>
      <Link
        className="inline-block text-[13px] font-semibold text-rust-600 hover:text-rust-700"
        href="/dashboard/coach"
      >
        ← All videos
      </Link>
      <h1 className="mt-[18px] font-display text-[28px] leading-tight font-bold tracking-[.02em] uppercase">
        {video.originalFilename}
      </h1>
      <p className="mt-1.5 font-mono text-xs text-ink-600">
        {video.player.name} · Uploaded {uploadedAt} · {formatVideoSize(video.sizeBytes)}
      </p>
      <div className="mt-[22px] grid items-start gap-7 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <video
            className="aspect-video w-full rounded-[10px] bg-pitch-950"
            controls
            preload="metadata"
            src={data.signedUrl}
          />
          <ReportPanel report={report} />
        </div>
        <VideoComments
          comments={comments}
          form={<CommentForm error={commentError} videoId={videoId} />}
        />
      </div>
    </PageShell>
  );
}

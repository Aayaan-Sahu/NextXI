import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import {
  CoachStatus,
  PlayerStatus,
  PlayerVideoStatus,
  ReportReviewStatus,
  ReportStatus,
  Visibility,
} from "@/app/generated/prisma/enums";
import { AdminPreviewBar } from "@/components/admin-preview-bar";
import { ClipPlayer } from "@/components/clip-player";
import { ReportPanel } from "@/components/report-panel";
import { ReviewActions } from "@/components/review-actions";
import { Chip, Notice, PageShell, PageTitle } from "@/components/ui";
import { COMMENT_HINT_PUBLISHED, CommentForm, VideoComments } from "@/components/video-comments";
import { VideoTimeProvider } from "@/components/video-time";
import { getAdminPreview } from "@/lib/admin-preview";
import { getProfile, requireUser } from "@/lib/auth";
import { hasAcceptedConnection } from "@/lib/connections";
import { parseClipTime } from "@/lib/format-time";
import { prisma } from "@/lib/prisma";
import { getDerivedMeasurements } from "@/lib/report-history";
import { deriveMoments, deriveVideoFps } from "@/lib/report-moments";
import { isReportPublished, redactReportForPlayer } from "@/lib/report-review";
import { getReviewingCoachNames } from "@/lib/report-review.server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatVideoSize, formatVideoTags } from "@/lib/videos";
import { getVideoReport } from "@/lib/videos.server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * The coach's review screen: the clip with its moments, the feedback thread
 * and composer, and — for a connected coach on a report the player can't see
 * yet — the sign-off panel above the report itself.
 */
export default async function CoachVideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ videoId: string }>;
  searchParams: Promise<{ commentError?: string; reviewError?: string; message?: string; t?: string }>;
}) {
  const user = await requireUser();
  // An administrator reading this coach's review screen (lib/admin-preview).
  // The composer and the sign-off panel come off below, and the visit does
  // not mark the clip seen — that is the coach's list to keep.
  const preview = await getAdminPreview(user);
  const coachId = preview?.coachId ?? user.id;
  const profile = await getProfile(coachId);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "coach") redirect("/dashboard/player");
  if (profile.coach.status !== CoachStatus.APPROVED) redirect("/dashboard/coach");

  const [{ videoId }, { commentError, reviewError, message, t }] = await Promise.all([
    params,
    searchParams,
  ]);

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
  const connected = await hasAcceptedConnection(coachId, video.playerId);
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

  // Opening the video marks it seen, dropping it from the coach's new-clips
  // list. Only for connected coaches: that list is connected players' videos,
  // and a pre-connection look should still read as new once connected.
  if (connected && !preview) {
    await prisma.videoView.upsert({
      where: { videoId_viewerId: { videoId, viewerId: coachId } },
      update: {},
      create: { videoId, viewerId: coachId },
    });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(video.storageBucket)
    .createSignedUrl(video.storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error("Could not create a playback link for this video.");
  }

  const [comments, fullReport] = await Promise.all([
    prisma.videoComment.findMany({
      // A connected coach sees the whole thread, held notes included; an
      // unconnected one only what the player can see.
      where: { videoId, ...(connected ? {} : { publishedAt: { not: null } }) },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        authorName: true,
        authorUsername: true,
        body: true,
        createdAt: true,
        timestampSec: true,
        publishedAt: true,
      },
    }),
    getVideoReport(videoId),
  ]);

  const delivered = fullReport?.status === ReportStatus.READY;
  const published = isReportPublished(fullReport);
  // The connected coach reviews the report itself; a coach browsing a public
  // player they aren't connected to waits for it like the player does.
  const report = connected ? fullReport : redactReportForPlayer(fullReport);
  const showReport = connected || published;
  const canReview = connected && delivered && !published;

  const [derived, coachNames] = await Promise.all([
    // Value + own-range + last-session rows, from the player's published history.
    showReport ? getDerivedMeasurements(video, report) : Promise.resolve(null),
    !connected && delivered && !published
      ? getReviewingCoachNames(video.playerId)
      : Promise.resolve([]),
  ]);
  const moments = showReport ? deriveMoments(report?.payload) : [];
  const fps = showReport ? deriveVideoFps(report?.payload) : null;

  const firstName = video.player.name.split(" ")[0] || video.player.name;
  const commentHint = canReview
    ? `Up to 2000 characters · hidden from ${firstName} until you approve the report.`
    : COMMENT_HINT_PUBLISHED;

  const uploadedAt = (video.uploadedAt ?? video.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <PageShell>
      {preview ? <AdminPreviewBar name={preview.name} /> : null}
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
      {/* One clock for the clip, the report's timestamps and the comments. */}
      <VideoTimeProvider>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-8">
            <ClipPlayer
              fps={fps}
              initialTime={parseClipTime(t)}
              moments={moments}
              src={data.signedUrl}
            />
            {/* Feedback stays connection-gated (the action re-checks server-side).
                Keyed on the newest note so a successful post clears the composer. */}
            <VideoComments
              comments={comments}
              form={
                connected && !preview ? (
                  <CommentForm
                    error={commentError}
                    hint={commentHint}
                    key={comments.at(-1)?.id ?? "first"}
                    videoId={videoId}
                  />
                ) : undefined
              }
            />
          </div>
          <div className="grid gap-4">
            <Notice>{message}</Notice>
            {canReview && !preview && report ? (
              <ReviewActions
                error={reviewError}
                hold={
                  report.reviewStatus === ReportReviewStatus.HELD
                    ? {
                        reason: report.holdReason ?? "",
                        byName: report.reviewedByName,
                        bySelf: report.reviewedById === coachId,
                        at: report.reviewedAt,
                      }
                    : null
                }
                playerName={video.player.name}
                reportReadyAt={report.updatedAt}
                reviewStatus={
                  report.reviewStatus === ReportReviewStatus.HELD ? "HELD" : "AWAITING_REVIEW"
                }
                videoId={videoId}
              />
            ) : null}
            {connected && report?.reviewStatus === ReportReviewStatus.RELEASED ? (
              <p className="text-caption text-ink-600">
                Released to {firstName} without a coach&apos;s sign-off.
              </p>
            ) : null}
            <ReportPanel
              audience={connected ? "reviewer" : "observer"}
              coachNames={coachNames}
              derived={derived}
              report={report}
              viewerId={coachId}
            />
          </div>
        </div>
      </VideoTimeProvider>
    </PageShell>
  );
}

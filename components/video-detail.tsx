import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";
import { ReportReviewStatus, ReportStatus } from "@/app/generated/prisma/enums";
import { ClipPlayer } from "@/components/clip-player";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ReportPanel } from "@/components/report-panel";
import { Chip, PageShell, PageTitle } from "@/components/ui";
import { VideoComments } from "@/components/video-comments";
import { VideoTimeProvider } from "@/components/video-time";
import { prisma } from "@/lib/prisma";
import { getDerivedMeasurements } from "@/lib/report-history";
import { deriveMoments, deriveVideoFps } from "@/lib/report-moments";
import { isReportPublished, redactReportForPlayer } from "@/lib/report-review";
import { getReviewingCoachNames, releaseOrphanedReports } from "@/lib/report-review.server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatVideoSize, formatVideoTags } from "@/lib/videos";
import { getVideoReport } from "@/lib/videos.server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * The player's (and guardian's) video page. The report and every comment go
 * through the published gate: until a connected coach signs the report off,
 * the panel reads "With your coach" and the thread shows only what was
 * posted before the review began.
 */
export async function VideoDetail({
  audience = "player",
  backHref,
  commentsFootnote = "Only connected coaches can leave feedback here.",
  deleteAction,
  initialTime,
  sessionLinkBase,
  subtitlePrefix,
  where,
}: {
  /** "observer" is a connected club: same gate, but the report is somebody else's coach's. */
  audience?: "player" | "observer";
  backHref: string;
  commentsFootnote?: string;
  /** When set, the header carries a confirmed delete for this clip. */
  deleteAction?: (formData: FormData) => Promise<void>;
  /** A `?t=` deep link: open the clip paused at this second. */
  initialTime?: number;
  /** When set and the video belongs to a session, "back" returns there instead. */
  sessionLinkBase?: string;
  /** Prepended to the meta line, e.g. the player's name on a club's page. */
  subtitlePrefix?: string;
  where: Prisma.PlayerVideoWhereInput;
}) {
  const video = await prisma.playerVideo.findFirst({
    where,
    select: {
      id: true,
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
    },
  });

  if (!video) notFound();

  // A video reached via its session should return there; otherwise to the list.
  const sessionHref =
    video.sessionId && sessionLinkBase ? `${sessionLinkBase}/${video.sessionId}` : null;
  const resolvedBackHref = sessionHref ?? backHref;
  const backLabel = sessionHref ? "Back to session" : "All videos";

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(video.storageBucket)
    .createSignedUrl(video.storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error("Could not create a playback link for this video.");
  }

  let report = await getVideoReport(video.id);

  // Safety net: a report still waiting on a coach who has since gone
  // (revoked, account deleted) is released the moment the player opens it.
  if (
    report?.status === ReportStatus.READY &&
    report.reviewStatus === ReportReviewStatus.AWAITING_REVIEW &&
    (await releaseOrphanedReports(video.playerId, { revalidate: false })) > 0
  ) {
    report = await getVideoReport(video.id);
  }

  const delivered = report?.status === ReportStatus.READY;
  const published = isReportPublished(report);

  const [comments, coachNames] = await Promise.all([
    prisma.videoComment.findMany({
      where: { videoId: video.id, publishedAt: { not: null } },
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
    delivered && !published ? getReviewingCoachNames(video.playerId) : Promise.resolve([]),
  ]);

  // Value + own-range + last-session rows for the report, from prior reports.
  // Nothing derived from an unpublished payload leaves the server — not the
  // rows, not the moments list (a shot list would give the report away).
  const derived = published ? await getDerivedMeasurements(video, report) : null;
  const moments = published ? deriveMoments(report?.payload) : [];
  const fps = published ? deriveVideoFps(report?.payload) : null;

  const uploadedAt = (video.uploadedAt ?? video.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <PageShell>
      <Link
        className="inline-block text-ui font-semibold text-rust-600 no-underline hover:text-rust-700"
        href={resolvedBackHref}
      >
        ← {backLabel}
      </Link>
      <header className="mt-3.5 mb-6 flex items-start justify-between gap-6 max-md:flex-col">
        <div className="min-w-0">
          <PageTitle>{video.originalFilename}</PageTitle>
          <p className="mt-1.5 text-ui text-ink-600">
            {subtitlePrefix ? `${subtitlePrefix} · ` : ""}Uploaded {uploadedAt} ·{" "}
            {formatVideoSize(video.sizeBytes)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Chip>{formatVideoTags(video.category, video.variation, video.handedness)}</Chip>
          {deleteAction ? (
            <ConfirmDeleteButton
              action={deleteAction}
              description="This clip and its coaching report are removed for good."
              id={video.id}
              label="Delete"
              name={video.originalFilename}
              redirectTo={resolvedBackHref}
              variant="text"
              title="Delete this video?"
            />
          ) : null}
        </div>
      </header>
      {/* One clock for the clip, the report's timestamps and the comments. */}
      <VideoTimeProvider>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-8">
            <ClipPlayer fps={fps} initialTime={initialTime} moments={moments} src={data.signedUrl} />
            <VideoComments comments={comments} footnote={commentsFootnote} />
          </div>
          <ReportPanel
            audience={audience}
            coachNames={coachNames}
            derived={derived}
            report={redactReportForPlayer(report)}
          />
        </div>
      </VideoTimeProvider>
    </PageShell>
  );
}

import "server-only";
import type { Prisma } from "@/app/generated/prisma/client";
import { PlayerVideoStatus, ReportStatus } from "@/app/generated/prisma/enums";
import { isFinalReportFailure } from "@/lib/report-errors";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatVideoTags, VIDEO_BUCKET } from "@/lib/videos";

/**
 * The status a player should see: a FAILED report that still has retries left
 * is presented as PROCESSING, because the failure copy promises an automatic
 * retry — only dead-lettered failures read as failed.
 */
export function effectiveReportStatus(
  report: { status: ReportStatus; error: string | null } | null,
): ReportStatus | null {
  if (!report) return null;
  if (report.status === ReportStatus.FAILED && !isFinalReportFailure(report.error)) {
    return ReportStatus.PROCESSING;
  }
  return report.status;
}

const THUMBNAIL_URL_TTL_SECONDS = 60 * 60;

/** The coaching-report fields the detail views need, shaped for ReportPanel. */
export type VideoReport = {
  status: ReportStatus;
  schemaVersion: number | null;
  payload: Prisma.JsonValue | null;
  error: string | null;
  modelVersion: string | null;
  updatedAt: Date;
};

/** The AI coaching report for a video, or null if no slot has been created yet. */
export async function getVideoReport(videoId: string): Promise<VideoReport | null> {
  return prisma.report.findUnique({
    where: { videoId },
    select: {
      status: true,
      schemaVersion: true,
      payload: true,
      error: true,
      modelVersion: true,
      updatedAt: true,
    },
  });
}

/**
 * A player's standalone ready videos with signed thumbnail URLs, shaped for
 * VideoGrid. Videos filed under a practice session are shown on the session
 * page instead, so they're excluded here.
 */
export async function getReadyVideoGridItems(playerId: string) {
  const videos = await prisma.playerVideo.findMany({
    where: {
      playerId,
      status: PlayerVideoStatus.READY,
      sessionId: null,
    },
    orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
    select: {
      category: true,
      createdAt: true,
      handedness: true,
      id: true,
      originalFilename: true,
      sizeBytes: true,
      thumbnailPath: true,
      uploadedAt: true,
      variation: true,
      report: { select: { status: true, error: true } },
      _count: { select: { comments: true } },
    },
  });

  const thumbnailUrlByPath = await getThumbnailUrlByPath(
    videos.flatMap((video) => video.thumbnailPath ?? []),
  );

  return videos.map(({ _count, report, ...video }) => ({
    ...video,
    commentCount: _count.comments,
    reportStatus: effectiveReportStatus(report),
    tagLabel: formatVideoTags(video.category, video.variation, video.handedness),
    thumbnailUrl: video.thumbnailPath
      ? (thumbnailUrlByPath.get(video.thumbnailPath) ?? null)
      : null,
  }));
}

/** Whole-day index of a date on the London calendar (en-CA gives YYYY-MM-DD). */
export function londonDayNumber(date: Date) {
  return (
    Date.parse(
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(date),
    ) / 86_400_000
  );
}

/** Monday-start week index on the London calendar. */
function londonWeekNumber(date: Date) {
  return Math.floor((londonDayNumber(date) + 3) / 7);
}

/**
 * Account-wide numbers for the player home header. Unlike the grid query this
 * spans session-filed videos too, so the stats can never contradict the
 * latest-report card (which also spans sessions).
 */
export async function getPlayerVideoPulse(playerId: string) {
  const videos = await prisma.playerVideo.findMany({
    where: { playerId, status: PlayerVideoStatus.READY },
    orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
    select: {
      createdAt: true,
      uploadedAt: true,
      report: { select: { status: true, error: true } },
    },
  });

  const statuses = videos.map((video) => effectiveReportStatus(video.report));

  // Streak: consecutive London weeks with at least one upload, anchored on
  // this week when it has one, else last week (a streak still extendable);
  // otherwise the streak is over and reads as 0.
  const weeks = new Set(
    videos.map((video) => londonWeekNumber(video.uploadedAt ?? video.createdAt)),
  );
  const thisWeek = londonWeekNumber(new Date());
  let streakWeeks = 0;
  let cursor: number | null = weeks.has(thisWeek)
    ? thisWeek
    : weeks.has(thisWeek - 1)
      ? thisWeek - 1
      : null;
  while (cursor !== null && weeks.has(cursor)) {
    streakWeeks += 1;
    cursor -= 1;
  }

  return {
    totalVideos: videos.length,
    latestUploadAt: videos[0] ? (videos[0].uploadedAt ?? videos[0].createdAt) : null,
    reportsReady: statuses.filter((status) => status === ReportStatus.READY).length,
    analysing: statuses.some(
      (status) => status === ReportStatus.PENDING || status === ReportStatus.PROCESSING,
    ),
    streakWeeks,
  };
}

/** Batch-signs thumbnail storage paths, returning a path → signed URL map. */
export async function getThumbnailUrlByPath(
  thumbnailPaths: string[],
): Promise<Map<string, string>> {
  if (!thumbnailPaths.length) return new Map();

  const { data: signed } = await createSupabaseAdminClient()
    .storage.from(VIDEO_BUCKET)
    .createSignedUrls(thumbnailPaths, THUMBNAIL_URL_TTL_SECONDS);

  const urlByPath = new Map<string, string>();
  for (const entry of signed ?? []) {
    if (!entry.error && entry.path && entry.signedUrl) {
      urlByPath.set(entry.path, entry.signedUrl);
    }
  }
  return urlByPath;
}

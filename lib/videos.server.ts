import "server-only";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  PlayerVideoStatus,
  ReportReviewStatus,
  ReportStatus,
} from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { reportDisplayStatus, type ReportViewer } from "@/lib/report-review";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatVideoTags, VIDEO_BUCKET } from "@/lib/videos";

// Moved to the pure module so client components and tests can share it;
// re-exported here for the callers that always imported it from this file.
export { effectiveReportStatus } from "@/lib/report-review";

const THUMBNAIL_URL_TTL_SECONDS = 60 * 60;

/** The coaching-report fields the detail views need, shaped for ReportPanel. */
export type VideoReport = {
  status: ReportStatus;
  schemaVersion: number | null;
  payload: Prisma.JsonValue | null;
  error: string | null;
  modelVersion: string | null;
  updatedAt: Date;
  // Coach review (lib/report-review.ts). The stamp reads the denormalised
  // name; `reviewerCredential` is the approving coach's first certification
  // or their club, looked up by id — the app never joins auth.users.
  reviewStatus: ReportReviewStatus;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  coachNote: string | null;
  holdReason: string | null;
  reviewerCredential: string | null;
};

/** The AI coaching report for a video, or null if no slot has been created yet. */
export async function getVideoReport(videoId: string): Promise<VideoReport | null> {
  const report = await prisma.report.findUnique({
    where: { videoId },
    select: {
      status: true,
      schemaVersion: true,
      payload: true,
      error: true,
      modelVersion: true,
      updatedAt: true,
      reviewStatus: true,
      reviewedById: true,
      reviewedByName: true,
      reviewedAt: true,
      coachNote: true,
      holdReason: true,
    },
  });
  if (!report) return null;

  const reviewer =
    report.reviewStatus === ReportReviewStatus.APPROVED && report.reviewedById
      ? await prisma.coach.findUnique({
          where: { id: report.reviewedById },
          select: { certifications: true, club: true },
        })
      : null;

  return {
    ...report,
    reviewerCredential: reviewer?.certifications[0] ?? reviewer?.club ?? null,
  };
}

/**
 * A player's standalone ready videos with signed thumbnail URLs, shaped for
 * VideoGrid. Videos filed under a practice session are shown on the session
 * page instead, so they're excluded here.
 *
 * `viewer` decides what the card says about the report and which comments
 * count: a player (or guardian) sees "With your coach" and only published
 * comments while a report awaits review; a connected coach sees the review
 * state itself. Defaults to the player's view — the restrictive one.
 */
export async function getReadyVideoGridItems(playerId: string, viewer: ReportViewer = "player") {
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
      report: { select: { status: true, error: true, reviewStatus: true } },
      _count: { select: { comments: publishedCommentCount(viewer) } },
    },
  });

  const thumbnailUrlByPath = await getThumbnailUrlByPath(
    videos.flatMap((video) => video.thumbnailPath ?? []),
  );

  return videos.map(({ _count, report, ...video }) => ({
    ...video,
    commentCount: _count.comments,
    reportStatus: reportDisplayStatus(report, viewer),
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
      report: { select: { status: true, error: true, reviewStatus: true } },
    },
  });

  const statuses = videos.map((video) => reportDisplayStatus(video.report, "player"));

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
    // READY here means published: an approved or released report.
    reportsReady: statuses.filter((status) => status === ReportStatus.READY).length,
    // Delivered but not yet signed off by the player's coach.
    withCoach: statuses.filter((status) => status === "WITH_COACH").length,
    analysing: statuses.some(
      (status) => status === ReportStatus.PENDING || status === ReportStatus.PROCESSING,
    ),
    streakWeeks,
  };
}

/**
 * The relation-count argument for a video's comments: a player only counts
 * what they can read, a coach counts the whole thread (held ones included).
 */
export function publishedCommentCount(viewer: ReportViewer) {
  return viewer === "player" ? { where: { publishedAt: { not: null } } } : true;
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

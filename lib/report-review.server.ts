import "server-only";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  CoachStatus,
  PlayerVideoStatus,
  ReportReviewStatus,
  ReportStatus,
} from "@/app/generated/prisma/enums";
import { getAcceptedCounterpartIds } from "@/lib/connections";
import { ageInYears } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import {
  PUBLISHED_REVIEW_STATUSES,
  UNPUBLISHED_REVIEW_STATUSES,
  type ApprovalQueueItem,
} from "@/lib/report-review";
import { formatVideoTags } from "@/lib/videos";
import { getThumbnailUrlByPath } from "@/lib/videos.server";

/**
 * The Prisma side of coach review: who may approve, the one write that
 * publishes a report, the auto-release paths, and the coach queue queries.
 * The pure rules (what "published" means, how a delivery moves review state)
 * are in lib/report-review.ts.
 */

/** Prisma fragment for "the player may see this report". */
export const publishedReportWhere = {
  status: ReportStatus.READY,
  reviewStatus: { in: [...PUBLISHED_REVIEW_STATUSES] },
} satisfies Prisma.ReportWhereInput;

/** Coaches who could approve this player's reports right now. */
export async function countApprovers(playerId: string): Promise<number> {
  const counterpartIds = await getAcceptedCounterpartIds(playerId);
  if (!counterpartIds.length) return 0;
  return prisma.coach.count({
    where: { id: { in: counterpartIds }, status: CoachStatus.APPROVED },
  });
}

/**
 * The only way a report becomes visible to its player. Conditional on the
 * report still being unpublished, so two coaches approving at once (or an
 * approval racing the pipeline's auto-release) can't double-publish — the
 * second writer gets `false`. Comments held for the review are released in
 * the same transaction, so nothing can be left hidden forever.
 */
export async function publishReport(
  tx: Prisma.TransactionClient,
  args: {
    videoId: string;
    reviewStatus: typeof ReportReviewStatus.APPROVED | typeof ReportReviewStatus.RELEASED;
    reviewedById: string | null;
    reviewedByName: string | null;
    coachNote?: string | null;
    at?: Date;
  },
): Promise<boolean> {
  const at = args.at ?? new Date();
  const { count } = await tx.report.updateMany({
    where: {
      videoId: args.videoId,
      status: ReportStatus.READY,
      reviewStatus: { in: [...UNPUBLISHED_REVIEW_STATUSES] },
    },
    data: {
      reviewStatus: args.reviewStatus,
      reviewedById: args.reviewedById,
      reviewedByName: args.reviewedByName,
      // A human's timestamp: an auto-release records nobody and no time.
      reviewedAt: args.reviewedById ? at : null,
      coachNote: args.coachNote ?? null,
      holdReason: null,
    },
  });
  if (count === 0) return false;
  await tx.videoComment.updateMany({
    where: { videoId: args.videoId, publishedAt: null },
    data: { publishedAt: at },
  });
  return true;
}

/**
 * Every surface that shows this report, so an approval or a hold is visible
 * on the next navigation without a reload. The layout revalidation refreshes
 * the coach's nav badge (app/dashboard/layout.tsx).
 */
export function revalidateReportSurfaces({
  videoId,
  playerId,
  sessionId,
}: {
  videoId: string;
  playerId: string;
  sessionId: string | null;
}) {
  const paths = [
    "/dashboard/coach",
    `/dashboard/coach/videos/${videoId}`,
    `/dashboard/coach/players/${playerId}`,
    "/dashboard/player",
    `/dashboard/player/videos/${videoId}`,
    "/dashboard/player/sessions",
    "/dashboard/progress",
    "/dashboard/guardian",
    `/dashboard/guardian/videos/${videoId}`,
    "/dashboard/admin",
    ...(sessionId
      ? [`/dashboard/player/sessions/${sessionId}`, `/dashboard/coach/sessions/${sessionId}`]
      : []),
  ];
  for (const path of paths) revalidatePath(path);
  revalidatePath("/dashboard", "layout");
}

/**
 * A player whose last reviewing coach has gone (revoked, or the account
 * deleted) would otherwise wait forever: release anything of theirs still
 * awaiting review. Held reports stay held — a hold is a human decision and is
 * already on the admin queue. A no-op for coaches, guardians and players who
 * still have a coach. Pass `revalidate: false` from a render (Next forbids
 * revalidating while rendering); the page is re-reading the report anyway.
 */
export async function releaseOrphanedReports(
  userId: string,
  options: { revalidate?: boolean } = {},
): Promise<number> {
  const waiting = await prisma.report.findMany({
    where: {
      status: ReportStatus.READY,
      reviewStatus: ReportReviewStatus.AWAITING_REVIEW,
      video: { playerId: userId },
    },
    select: { videoId: true, video: { select: { sessionId: true } } },
  });
  if (!waiting.length) return 0;
  if ((await countApprovers(userId)) > 0) return 0;

  let released = 0;
  for (const report of waiting) {
    const ok = await prisma.$transaction((tx) =>
      publishReport(tx, {
        videoId: report.videoId,
        reviewStatus: ReportReviewStatus.RELEASED,
        reviewedById: null,
        reviewedByName: null,
      }),
    );
    if (!ok) continue;
    released += 1;
    if (options.revalidate !== false) {
      revalidateReportSurfaces({
        videoId: report.videoId,
        playerId: userId,
        sessionId: report.video.sessionId,
      });
    }
  }
  return released;
}

const unpublishedForCoach = (counterpartIds: string[]) =>
  ({
    status: ReportStatus.READY,
    video: { status: PlayerVideoStatus.READY, playerId: { in: counterpartIds } },
  }) satisfies Prisma.ReportWhereInput;

/**
 * The reports of this coach's connected players that a player can't see yet,
 * oldest first. Held ones come back separately: the coach may still approve
 * them, but they aren't waiting on the coach.
 */
export async function getAwaitingReviewForCoach(
  coachId: string,
): Promise<{ awaiting: ApprovalQueueItem[]; held: ApprovalQueueItem[] }> {
  const counterpartIds = await getAcceptedCounterpartIds(coachId);
  if (!counterpartIds.length) return { awaiting: [], held: [] };

  const reports = await prisma.report.findMany({
    where: {
      ...unpublishedForCoach(counterpartIds),
      reviewStatus: { in: [...UNPUBLISHED_REVIEW_STATUSES] },
    },
    orderBy: { updatedAt: "asc" },
    select: {
      reviewStatus: true,
      updatedAt: true,
      holdReason: true,
      reviewedByName: true,
      video: {
        select: {
          id: true,
          category: true,
          handedness: true,
          originalFilename: true,
          thumbnailPath: true,
          variation: true,
          player: { select: { name: true, dateOfBirth: true } },
        },
      },
    },
  });

  const thumbnailUrlByPath = await getThumbnailUrlByPath(
    reports.flatMap((report) => report.video.thumbnailPath ?? []),
  );

  const items: ApprovalQueueItem[] = reports.map(({ video, ...report }) => ({
    id: video.id,
    originalFilename: video.originalFilename,
    playerName: video.player.name,
    playerAge: ageInYears(video.player.dateOfBirth),
    tagLabel: formatVideoTags(video.category, video.variation, video.handedness),
    thumbnailUrl: video.thumbnailPath
      ? (thumbnailUrlByPath.get(video.thumbnailPath) ?? null)
      : null,
    reportReadyAt: report.updatedAt,
    reviewStatus: report.reviewStatus === ReportReviewStatus.HELD ? "HELD" : "AWAITING_REVIEW",
    holdReason: report.holdReason,
    heldBy: report.reviewStatus === ReportReviewStatus.HELD ? report.reviewedByName : null,
  }));

  return {
    awaiting: items.filter((item) => item.reviewStatus === "AWAITING_REVIEW"),
    held: items.filter((item) => item.reviewStatus === "HELD"),
  };
}

/** The coach's nav badge: reports waiting on them (held ones aren't). */
export async function getAwaitingReviewCount(coachId: string): Promise<number> {
  const counterpartIds = await getAcceptedCounterpartIds(coachId);
  if (!counterpartIds.length) return 0;
  return prisma.report.count({
    where: {
      ...unpublishedForCoach(counterpartIds),
      reviewStatus: ReportReviewStatus.AWAITING_REVIEW,
    },
  });
}

/** Names of the approved coaches connected to a player, for the waiting copy. */
export async function getReviewingCoachNames(playerId: string): Promise<string[]> {
  const counterpartIds = await getAcceptedCounterpartIds(playerId);
  if (!counterpartIds.length) return [];
  const coaches = await prisma.coach.findMany({
    where: { id: { in: counterpartIds }, status: CoachStatus.APPROVED },
    orderBy: { name: "asc" },
    select: { name: true },
  });
  return coaches.map((coach) => coach.name);
}

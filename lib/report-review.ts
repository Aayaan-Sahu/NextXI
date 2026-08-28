import { ReportReviewStatus, ReportStatus } from "@/app/generated/prisma/enums";
import { isFinalReportFailure } from "@/lib/report-errors";

/**
 * Coach review of AI coaching reports — the pure rules. The Prisma side
 * (publishing, the coach queue, the auto-release checks) lives in
 * lib/report-review.server.ts.
 *
 * `Report.status` is the pipeline lifecycle and never changes meaning: READY
 * means the worker delivered a payload. Whether the *player* may see that
 * payload is `reviewStatus`, which only matters while status is READY:
 *
 *   AWAITING_REVIEW  a connected coach still has to look at it
 *   HELD             a coach stopped it with a reason; an admin can release or re-run it
 *   APPROVED         a connected coach signed it off — the report carries their stamp
 *   RELEASED         published with no stamp: nobody to wait for, released by an
 *                    admin, or grandfathered when review arrived
 *
 * "Published" is the one predicate every player-facing read path uses.
 */

export const MAX_COACH_NOTE_LENGTH = 500;
export const MAX_HOLD_REASON_LENGTH = 500;

export const PUBLISHED_REVIEW_STATUSES = [
  ReportReviewStatus.APPROVED,
  ReportReviewStatus.RELEASED,
] as const;

export const UNPUBLISHED_REVIEW_STATUSES = [
  ReportReviewStatus.AWAITING_REVIEW,
  ReportReviewStatus.HELD,
] as const;

export type ReviewableReport = { status: ReportStatus; reviewStatus: ReportReviewStatus };

/** Who is looking: players and guardians share one view, coaches another. */
export type ReportViewer = "player" | "coach";

/**
 * The one status a surface renders — pipeline state first, then review state
 * per viewer. Players see WITH_COACH for any unpublished READY report; coaches
 * see which of the two unpublished states it is.
 */
export type ReportDisplayStatus = ReportStatus | "WITH_COACH" | "AWAITING_REVIEW" | "HELD";

export function isPublishedReviewStatus(reviewStatus: ReportReviewStatus): boolean {
  return (PUBLISHED_REVIEW_STATUSES as readonly ReportReviewStatus[]).includes(reviewStatus);
}

/** True when a player may see this report: READY and approved or released. */
export function isReportPublished(report: ReviewableReport | null | undefined): boolean {
  return report?.status === ReportStatus.READY && isPublishedReviewStatus(report.reviewStatus);
}

/**
 * The pipeline status a player should see: a FAILED report that still has
 * retries left is presented as PROCESSING, because the failure copy promises
 * an automatic retry — only dead-lettered failures read as failed.
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

export function reportDisplayStatus(
  report: (ReviewableReport & { error: string | null }) | null,
  viewer: ReportViewer,
): ReportDisplayStatus | null {
  const effective = effectiveReportStatus(report);
  if (!report || effective !== ReportStatus.READY || isReportPublished(report)) return effective;
  if (viewer === "player") return "WITH_COACH";
  return report.reviewStatus === ReportReviewStatus.HELD ? "HELD" : "AWAITING_REVIEW";
}

type RedactableReport = ReviewableReport & {
  payload: unknown;
  schemaVersion: number | null;
  modelVersion: string | null;
  coachNote: string | null;
  holdReason: string | null;
};

/**
 * Defence in depth for player-facing props: an unpublished report loses its
 * payload and review notes before it reaches a component, so no wrapper can
 * ever serialise what the player must not see yet.
 */
export function redactReportForPlayer<T extends RedactableReport>(report: T | null): T | null {
  if (!report || report.status !== ReportStatus.READY || isReportPublished(report)) return report;
  return {
    ...report,
    payload: null,
    schemaVersion: null,
    modelVersion: null,
    coachNote: null,
    holdReason: null,
  };
}

/**
 * Where a delivery leaves the review state. A published report stays
 * published (the contract allows re-delivering a ready report; the stamp
 * stands). Anything else resolves by whether the player has a coach who can
 * review it: with one, it waits (a held report re-run by the pipeline goes
 * back to the queue clean); with none, it is released at once. A failed
 * delivery leaves review state alone — nothing is visible while status is
 * not READY anyway.
 */
export function nextReviewStatusOnIngest(
  current: ReportReviewStatus | null,
  isReady: boolean,
  approvers: number,
): ReportReviewStatus {
  const status = current ?? ReportReviewStatus.AWAITING_REVIEW;
  if (!isReady) return status;
  if (isPublishedReviewStatus(status)) return status;
  return approvers > 0 ? ReportReviewStatus.AWAITING_REVIEW : ReportReviewStatus.RELEASED;
}

/** One row of the coach's "Awaiting your approval" list. */
export type ApprovalQueueItem = {
  id: string;
  originalFilename: string;
  playerName: string;
  playerAge: number | null;
  tagLabel: string;
  thumbnailUrl: string | null;
  reportReadyAt: Date;
  reviewStatus: "AWAITING_REVIEW" | "HELD";
  holdReason: string | null;
  heldBy: string | null;
};

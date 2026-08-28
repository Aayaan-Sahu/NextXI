import { describe, expect, test } from "bun:test";
import { ReportReviewStatus, ReportStatus } from "@/app/generated/prisma/enums";
import { REPORT_ERROR_EXHAUSTED } from "@/lib/report-errors";
import {
  isReportPublished,
  nextReviewStatusOnIngest,
  redactReportForPlayer,
  reportDisplayStatus,
} from "@/lib/report-review";

const { AWAITING_REVIEW, HELD, APPROVED, RELEASED } = ReportReviewStatus;
const { PENDING, PROCESSING, READY, FAILED } = ReportStatus;

describe("isReportPublished", () => {
  test("only a READY report that is approved or released", () => {
    expect(isReportPublished({ status: READY, reviewStatus: APPROVED })).toBe(true);
    expect(isReportPublished({ status: READY, reviewStatus: RELEASED })).toBe(true);
    expect(isReportPublished({ status: READY, reviewStatus: AWAITING_REVIEW })).toBe(false);
    expect(isReportPublished({ status: READY, reviewStatus: HELD })).toBe(false);
    // Review state means nothing until the pipeline has delivered.
    expect(isReportPublished({ status: PROCESSING, reviewStatus: APPROVED })).toBe(false);
    expect(isReportPublished({ status: FAILED, reviewStatus: RELEASED })).toBe(false);
    expect(isReportPublished(null)).toBe(false);
  });
});

describe("nextReviewStatusOnIngest", () => {
  test("a published report stays published on re-delivery", () => {
    expect(nextReviewStatusOnIngest(APPROVED, true, 0)).toBe(APPROVED);
    expect(nextReviewStatusOnIngest(APPROVED, true, 2)).toBe(APPROVED);
    expect(nextReviewStatusOnIngest(RELEASED, true, 2)).toBe(RELEASED);
  });

  test("a report with a coach to review it waits", () => {
    expect(nextReviewStatusOnIngest(null, true, 1)).toBe(AWAITING_REVIEW);
    expect(nextReviewStatusOnIngest(AWAITING_REVIEW, true, 1)).toBe(AWAITING_REVIEW);
    // A held report the pipeline re-ran goes back to the queue.
    expect(nextReviewStatusOnIngest(HELD, true, 1)).toBe(AWAITING_REVIEW);
  });

  test("a report with nobody to review it is released at once", () => {
    expect(nextReviewStatusOnIngest(null, true, 0)).toBe(RELEASED);
    expect(nextReviewStatusOnIngest(AWAITING_REVIEW, true, 0)).toBe(RELEASED);
    expect(nextReviewStatusOnIngest(HELD, true, 0)).toBe(RELEASED);
  });

  test("a failed delivery leaves review state alone", () => {
    expect(nextReviewStatusOnIngest(null, false, 0)).toBe(AWAITING_REVIEW);
    expect(nextReviewStatusOnIngest(HELD, false, 3)).toBe(HELD);
    expect(nextReviewStatusOnIngest(APPROVED, false, 0)).toBe(APPROVED);
  });
});

describe("reportDisplayStatus", () => {
  const ready = (reviewStatus: ReportReviewStatus) => ({ status: READY, reviewStatus, error: null });

  test("pipeline states pass through for every viewer", () => {
    for (const viewer of ["player", "coach"] as const) {
      expect(reportDisplayStatus(null, viewer)).toBeNull();
      expect(reportDisplayStatus({ status: PENDING, reviewStatus: AWAITING_REVIEW, error: null }, viewer)).toBe(PENDING);
      expect(reportDisplayStatus({ status: FAILED, reviewStatus: AWAITING_REVIEW, error: "boom" }, viewer)).toBe(PROCESSING);
      expect(reportDisplayStatus({ status: FAILED, reviewStatus: AWAITING_REVIEW, error: REPORT_ERROR_EXHAUSTED }, viewer)).toBe(FAILED);
      expect(reportDisplayStatus(ready(APPROVED), viewer)).toBe(READY);
      expect(reportDisplayStatus(ready(RELEASED), viewer)).toBe(READY);
    }
  });

  test("an unpublished READY report reads differently per viewer", () => {
    expect(reportDisplayStatus(ready(AWAITING_REVIEW), "player")).toBe("WITH_COACH");
    expect(reportDisplayStatus(ready(HELD), "player")).toBe("WITH_COACH");
    expect(reportDisplayStatus(ready(AWAITING_REVIEW), "coach")).toBe("AWAITING_REVIEW");
    expect(reportDisplayStatus(ready(HELD), "coach")).toBe("HELD");
  });
});

describe("redactReportForPlayer", () => {
  const report = {
    status: READY,
    reviewStatus: HELD,
    payload: { shots: [] },
    schemaVersion: 2,
    modelVersion: "v1",
    coachNote: null,
    holdReason: "Mis-tracked the bat",
    updatedAt: new Date(0),
  };

  test("strips everything a player must not see from an unpublished report", () => {
    const redacted = redactReportForPlayer(report);
    expect(redacted).not.toBeNull();
    expect(redacted?.payload).toBeNull();
    expect(redacted?.schemaVersion).toBeNull();
    expect(redacted?.modelVersion).toBeNull();
    expect(redacted?.holdReason).toBeNull();
    // Pipeline state and the untouched fields survive so the panel can still branch.
    expect(redacted?.status).toBe(READY);
    expect(redacted?.reviewStatus).toBe(HELD);
    expect(redacted?.updatedAt).toEqual(new Date(0));
  });

  test("leaves published and undelivered reports untouched", () => {
    const approved = { ...report, reviewStatus: APPROVED, holdReason: null };
    expect(redactReportForPlayer(approved)).toBe(approved);
    const pending = { ...report, status: PENDING };
    expect(redactReportForPlayer(pending)).toBe(pending);
    expect(redactReportForPlayer(null)).toBeNull();
  });
});

/**
 * Dead-letter error sentences written by the worker claim endpoint
 * (app/api/reports/claim/route.ts, which imports them from here). A FAILED
 * report carrying one of these is final — the pipeline will never pick it up
 * again — so player-facing copy must not promise an automatic retry. They are
 * user-safe sentences and are shown verbatim.
 */
export const REPORT_ERROR_EXHAUSTED =
  "The analysis did not complete after several attempts.";
export const REPORT_ERROR_UNTAGGED =
  "This video has no discipline tag, so it cannot be analysed.";

export const FINAL_REPORT_ERRORS = [
  REPORT_ERROR_EXHAUSTED,
  REPORT_ERROR_UNTAGGED,
] as const;

/** True when a failed report has been dead-lettered (no retries left). */
export function isFinalReportFailure(error: string | null) {
  return error !== null && (FINAL_REPORT_ERRORS as readonly string[]).includes(error);
}

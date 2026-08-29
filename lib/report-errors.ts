/**
 * Moved to shared/report-errors.ts — the apps show the same dead-letter
 * sentences and must not promise a retry the pipeline will never make.
 */
export * from "@/shared/report-errors";

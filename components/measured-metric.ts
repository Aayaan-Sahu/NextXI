/**
 * Moved to shared/measured-metric.ts — the model and the honesty rules about
 * references are shared with the mobile apps, which render the same rows.
 * Re-exported here because every product and marketing surface imports it
 * from this path; `report-metric.tsx` next door is still the one renderer.
 */
export * from "@/shared/measured-metric";

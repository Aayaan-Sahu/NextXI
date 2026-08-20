/**
 * The shape of a consistency reading. A consistency value is a 0-100
 * percentage derived from a coefficient of variation (higher = steadier), and
 * null when there isn't enough comparable data to score it honestly.
 *
 * Both the per-video batting report (across shots) and the session view
 * (across videos) produce these, and `ConsistencyRow` in report-panel.tsx
 * draws them, so the two read as one system.
 */
export type ConsistencyItem = { label: string; consistency: number | null };

import { VideoCategory } from "@/app/generated/prisma/enums";
import type { ConsistencyItem } from "@/components/consistency";

/**
 * Cross-video consistency for a practice session. Each video's AI report holds
 * per-instance scalars (for batting, one per detected shot); pooling the same
 * scalar across every video in the session and taking its coefficient of
 * variation gives a session-level steadiness score. This mirrors the per-video
 * consistency the Python worker computes across shots (api_batting.cv), just
 * pooled across videos instead. See docs/reports-contract.md.
 */

/** Below this many videos with ready reports, session stats aren't shown. */
export const MIN_VIDEOS_FOR_SESSION_STATS = 3;

/** Fewest comparable instances (shots) needed to score a single metric. */
const MIN_COMPARABLE_SAMPLES = 3;
/** Modified z-score above which an instance is treated as an anomaly and dropped. */
const OUTLIER_Z = 3.5;

type MetricPath = { path: readonly string[]; label: string };

// Normalized (fraction-of-height / stance-width) per-shot scalars from a
// batting report's `shots[]`, safe to pool across videos. Order = display order.
const SESSION_BATTING_METRICS: readonly MetricPath[] = [
  { path: ["front_foot_stride", "stride_length_frac_height"], label: "Stride length" },
  { path: ["back_foot_depth", "depth_frac_height"], label: "Back-foot depth" },
  { path: ["head", "head_stability_frac_height"], label: "Head stability" },
  { path: ["swing", "swing_straightness_mean"], label: "Swing path" },
  { path: ["swing", "backlift_height_norm"], label: "Backlift height" },
  { path: ["trigger", "duration_sec"], label: "Trigger duration" },
  { path: ["trigger", "gap_to_swing_sec"], label: "Trigger timing" },
];

// Per-delivery scalars from a bowling report's `delivery` section (one delivery
// per video). Paths are relative to the whole payload, not a shot. Distance /
// height metrics are height-normalized; the brace angle is scale-free.
const SESSION_BOWLING_METRICS: readonly MetricPath[] = [
  { path: ["delivery", "front_knee_brace", "landing_angle_deg"], label: "Front-knee brace" },
  { path: ["delivery", "stride", "length_frac_height"], label: "Delivery stride" },
  { path: ["delivery", "release", "height_frac_height"], label: "Release height" },
  { path: ["delivery", "run_up", "distance_frac_height"], label: "Run-up distance" },
  { path: ["delivery", "follow_through", "distance_frac_height"], label: "Follow-through" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readPath(root: unknown, path: readonly string[]): number | null {
  let current: unknown = root;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return num(current);
}

/** Population coefficient of variation (std/|mean|). Null if <2 samples or mean≈0. */
export function cv(values: number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length < 2) return null;
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  if (Math.abs(mean) < 1e-9) return null;
  const variance =
    finite.reduce((sum, value) => sum + (value - mean) ** 2, 0) / finite.length;
  return Math.sqrt(variance) / Math.abs(mean);
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Linear-interpolated quantile (numpy default), over an already-sorted array. */
function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Robust spread: MAD (scaled to σ), falling back to IQR when the MAD is zero. */
function robustScale(sorted: number[], center: number): number {
  const absDev = sorted.map((value) => Math.abs(value - center)).sort((a, b) => a - b);
  const mad = median(absDev);
  if (mad > 1e-9) return 1.4826 * mad;
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  return iqr > 1e-9 ? iqr / 1.349 : 0;
}

/** Same transform the per-video report uses: lower CV → higher consistency %. */
function consistencyPct(cvValue: number): number {
  return Math.round(100 * (1 - Math.min(Math.max(cvValue, 0), 1)));
}

/**
 * Consistency % for one metric, robust to anomalies. Drops clear outliers (a
 * mis-detected shot far from the rest) before measuring spread, but returns
 * null — shown as "—" — when the result wouldn't be trustworthy: too few
 * comparable instances, or a metric whose only variation was the outlier we
 * removed (values pinned at a floor plus one spike, e.g. a stray trigger).
 */
function robustConsistency(values: number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length < MIN_COMPARABLE_SAMPLES) return null;

  let kept = finite;
  let removedOutlier = false;
  // Outlier detection needs ≥4 points; with 3 you can't tell signal from noise.
  if (finite.length >= 4) {
    const sorted = [...finite].sort((a, b) => a - b);
    const center = median(sorted);
    const scale = robustScale(sorted, center);
    if (scale > 0) {
      kept = finite.filter((value) => Math.abs(value - center) / scale <= OUTLIER_Z);
      removedOutlier = kept.length < finite.length;
    }
  }

  if (kept.length < MIN_COMPARABLE_SAMPLES) return null;

  const cvValue = cv(kept);
  if (cvValue === null) return null;

  // If discarding the outlier leaves a near-constant remainder, the metric had
  // no real spread of its own — reporting ~100% would overstate. Call it N/A.
  if (removedOutlier && cvValue < 0.02) return null;

  return consistencyPct(cvValue);
}

function battingShots(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload) || !Array.isArray(payload.shots)) return [];
  return payload.shots.filter(isRecord);
}

/**
 * Computes session consistency from the member videos' report payloads by
 * pooling one scalar per instance across all videos, per metric. For batting an
 * instance is a detected shot (many per video); for bowling it's the single
 * delivery (one per video). Metrics and instances are chosen together so each
 * metric's path resolves against the right object.
 */
export function computeSessionConsistency(
  category: VideoCategory,
  payloads: unknown[],
): ConsistencyItem[] {
  const isBatting = category === VideoCategory.BATTING;
  const metrics = isBatting ? SESSION_BATTING_METRICS : SESSION_BOWLING_METRICS;
  const instances: Record<string, unknown>[] = isBatting
    ? payloads.flatMap(battingShots)
    : payloads.filter(isRecord);

  return metrics.flatMap(({ path, label }) => {
    const values = instances
      .map((instance) => readPath(instance, path))
      .filter((value): value is number => value !== null);
    // Nothing measured for this metric at all → omit the row entirely.
    // Measured but not trustworthy → keep the row, shown as "—".
    return values.length === 0 ? [] : [{ label, consistency: robustConsistency(values) }];
  });
}

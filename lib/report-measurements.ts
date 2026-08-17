import type { MeasuredMetric, MetricReference } from "@/components/measured-metric";
import { battingShots, median, readPath } from "@/lib/session-consistency";

/**
 * Derives v3-style measurement rows from a v2 batting/bowling payload plus the
 * player's report history, so every live report leads with the same clear rows
 * as the landing demo: the value in real units, the player's own recent range
 * ("Your range · Last N sessions"), and where they were last time.
 *
 * This is the platform-side producer of the `session` reference kind described
 * in docs/BENCHMARKS.md. The worker can't produce it — it sees one video and
 * no history — but the platform stores every previous report, so it derives
 * the band here at render time. Nothing is invented: the band is the min–max
 * of the player's own previous occasions, and a first analysis says so instead
 * of showing a made-up target. `published` / `elite` references still only
 * come from the pipeline (none currently qualify — see BENCHMARKS.md).
 *
 * Everything here is pure so it can run anywhere and be exercised without a
 * database; the Prisma query that feeds it lives in lib/report-history.ts.
 */

/** Previous occasions considered for the "Your range" band. */
export const HISTORY_WINDOW = 5;

export type ReportShape = "batting" | "bowling";

type MetricDef = {
  key: string;
  name: string;
  short: string;
  /** Path to the scalar, relative to an instance (shot / whole payload). */
  path: readonly string[];
  unit: string;
  decimals: number;
  /** |change| below this reads as "about the same", not a change. */
  sameWithin: number;
  /** [value went up, value went down] — quality-neutral direction words. */
  deltaWords: [string, string];
};

// Real-unit fields only (present when the clip calibrated) — a junior can act
// on "62 cm", not on a fraction of standing height. Order = display order.
const BATTING_METRICS: readonly MetricDef[] = [
  {
    key: "stride_length",
    name: "Stride length",
    short: "Stride",
    path: ["front_foot_stride", "stride_length_cm"],
    unit: "cm",
    decimals: 0,
    sameWithin: 1,
    deltaWords: ["longer", "shorter"],
  },
  {
    key: "back_foot_depth",
    name: "Back-foot depth",
    short: "Back foot",
    path: ["back_foot_depth", "depth_cm"],
    unit: "cm",
    decimals: 0,
    sameWithin: 1,
    deltaWords: ["deeper", "shallower"],
  },
  {
    key: "head_movement",
    name: "Head movement",
    short: "Head",
    path: ["head", "max_head_movement_cm"],
    unit: "cm",
    decimals: 1,
    sameWithin: 0.3,
    deltaWords: ["more", "less"],
  },
  {
    key: "trigger_gap",
    name: "Trigger timing",
    short: "Trigger",
    path: ["trigger", "gap_to_swing_sec"],
    unit: "s",
    decimals: 2,
    sameWithin: 0.03,
    deltaWords: ["longer", "shorter"],
  },
];

const BOWLING_METRICS: readonly MetricDef[] = [
  {
    key: "front_knee_brace",
    name: "Front-knee brace",
    short: "Brace",
    path: ["delivery", "front_knee_brace", "landing_angle_deg"],
    unit: "°",
    decimals: 0,
    sameWithin: 2,
    deltaWords: ["straighter", "more bent"],
  },
  {
    key: "delivery_stride",
    name: "Delivery stride",
    short: "Stride",
    path: ["delivery", "stride", "length_cm"],
    unit: "cm",
    decimals: 0,
    sameWithin: 2,
    deltaWords: ["longer", "shorter"],
  },
  {
    key: "release_height",
    name: "Release height",
    short: "Release",
    path: ["delivery", "release", "height_cm"],
    unit: "cm",
    decimals: 0,
    sameWithin: 2,
    deltaWords: ["higher", "lower"],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Which v2 shape a payload is, or null (v1 legacy / v3 measurements / junk). */
export function reportShape(payload: unknown): ReportShape | null {
  if (!isRecord(payload)) return null;
  // A payload carrying its own measurements array is already v3 — the UI
  // renders it directly and nothing needs deriving.
  if (Array.isArray(payload.measurements)) return null;
  if (Array.isArray(payload.shots)) return "batting";
  if (isRecord(payload.delivery)) return "bowling";
  return null;
}

function metricsFor(shape: ReportShape): readonly MetricDef[] {
  return shape === "batting" ? BATTING_METRICS : BOWLING_METRICS;
}

/** Batting measures per shot; bowling once per payload (one delivery each). */
function instancesOf(shape: ReportShape, payloads: unknown[]): unknown[] {
  return shape === "batting" ? payloads.flatMap(battingShots) : payloads;
}

/** Per-metric value for one occasion: median across its instances. */
function metricMedian(instances: unknown[], path: readonly string[]): number | null {
  const values = instances
    .map((instance) => readPath(instance, path))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  return values.length === 0 ? null : median(values);
}

/** One previous occasion's (session / standalone video) per-metric medians. */
export type OccasionValues = Record<string, number>;

/**
 * Pools one filming occasion's ready payloads into per-metric medians, keyed
 * by metric key. Metrics the occasion never measured are simply absent.
 */
export function occasionMetricValues(shape: ReportShape, payloads: unknown[]): OccasionValues {
  const instances = instancesOf(shape, payloads);
  const values: OccasionValues = {};
  for (const metric of metricsFor(shape)) {
    const value = metricMedian(instances, metric.path);
    if (value !== null) values[metric.key] = value;
  }
  return values;
}

const fmt = (value: number, decimals: number) => value.toFixed(decimals);

/** "58 cm" / "158°" — the degree sign binds tight, word units get a space. */
function withUnit(value: number, def: MetricDef): string {
  const joiner = def.unit === "°" ? "" : " ";
  return `${fmt(value, def.decimals)}${joiner}${def.unit}`;
}

/** "Last session 58 cm — 4 cm longer this time." Plain words, real units. */
function progressNote(def: MetricDef, value: number, previous: number | null): string {
  if (previous === null) {
    return "First time we've measured this — your progress starts here.";
  }
  const last = `Last session ${withUnit(previous, def)}`;
  const delta = value - previous;
  if (Math.abs(delta) < def.sameWithin) {
    return `${last} — about the same this time.`;
  }
  const word = delta > 0 ? def.deltaWords[0] : def.deltaWords[1];
  return `${last} — ${withUnit(Math.abs(delta), def)} ${word} this time.`;
}

function sessionReference(history: number[]): MetricReference {
  if (history.length === 0) return { kind: "none", label: "First analysis" };
  if (history.length === 1) {
    return { kind: "session", label: "Last session", band: [history[0], history[0]] };
  }
  return {
    kind: "session",
    label: `Last ${history.length} sessions`,
    band: [Math.min(...history), Math.max(...history)],
  };
}

/**
 * Derives the measurement rows for one report: current value per metric,
 * the player's recent range as the reference band, and the previous occasion's
 * value for the progress marker + note. `history` is oldest-first; only the
 * most recent HISTORY_WINDOW occasions count. Returns null when the payload
 * isn't a v2 shape or nothing in it measured in real units.
 *
 * Every metric is direction: "none" on purpose — a longer stride is a fact,
 * not a fault (no evidence links these values to skill; see BENCHMARKS.md),
 * so nothing here ever renders in the error colour.
 */
export function deriveMeasurements(
  payload: unknown,
  history: OccasionValues[],
): MeasuredMetric[] | null {
  const shape = reportShape(payload);
  if (!shape) return null;

  const current = occasionMetricValues(shape, [payload]);
  const recent = history.slice(-HISTORY_WINDOW);

  const rows = metricsFor(shape).flatMap((def) => {
    const value = current[def.key];
    if (value === undefined) return [];

    const metricHistory = recent
      .map((occasion) => occasion[def.key])
      .filter((occasionValue): occasionValue is number => occasionValue !== undefined);
    const previous = metricHistory.length
      ? metricHistory[metricHistory.length - 1]
      : null;

    const row: MeasuredMetric = {
      name: def.name,
      short: def.short,
      value,
      unit: def.unit,
      decimals: def.decimals,
      direction: "none",
      reference: sessionReference(metricHistory),
      note: progressNote(def, value, previous),
    };
    if (previous !== null) {
      row.previous = { value: previous, label: "Last session" };
    }
    return [row];
  });

  return rows.length > 0 ? rows : null;
}

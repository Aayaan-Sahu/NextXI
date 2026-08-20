/**
 * The data model for a single measured technique metric.
 *
 * The report used to show each metric as an opaque 0-100 score ("Stride 82,
 * elite 85"), which tells a player nothing about which way to correct. It
 * carries the real measurement instead: the value in real units, whatever we
 * can honestly compare it against, and a plain-English read.
 *
 * On references — this is the part that has to stay honest. There is no
 * published "elite benchmark" for most batting kinematics: the accessible
 * literature reports pooled means over mixed international-to-club samples,
 * measured on lab motion-capture rigs, and for stride length it explicitly
 * finds no difference between skilled and less-skilled batters. So a reference
 * is one of four things, and it always says which:
 *
 *   - `session`   the player's own recent range. Always available, always
 *                 defensible, and the most actionable comparison for a junior.
 *                 UI prefix: "Your range ·".
 *   - `published` a real published range, carried with its population so
 *                 nobody reads a provincial group mean as "elite".
 *                 UI prefix: "Benchmark ·".
 *   - `elite`     a genuinely elite target (gold). Unused until NextXI's own
 *                 pro reference set exists. UI prefix: "Elite ·".
 *   - `none`      no defensible comparison exists. We say so and show the
 *                 measurement alone rather than inventing a target.
 *
 * `label` carries the population / window in plain language; the full academic
 * citation travels in the optional `source` field, which is never rendered to
 * players — provenance stays machine-traceable without reading as a footnote.
 *
 * This module is the model and the honesty rules only — no drawing. Every
 * surface that shows a measurement (the dashboard report, the marketing report
 * card, the format preview) renders through `ReportMetricRow` in
 * `report-metric.tsx`, so there is exactly one answer to what a measurement
 * looks like. There were two for a while, and they drifted.
 */

export type Tone = "light" | "dark";

/** One-line explainer under the Measurements heading — stops readers hunting
    for an elite band on every row. */
export const MEASUREMENTS_EXPLAINER =
  "Compared to your recent sessions, unless labelled Benchmark or Elite.";

/** Which way is better. `none` means the metric is descriptive, not scored. */
export type Direction = "higher" | "lower" | "inside" | "none";

export type MetricReference =
  /** The elite gold standard — the target that gives a player something to climb
      toward. Only use where the source population genuinely was elite, and name
      that population in `label`. Sitting below an elite band is headroom, not a
      fault: it never renders in the error colour. */
  | {
      kind: "elite";
      label: string;
      band: [number, number];
      source?: string;
      /** Size of the reference population, when the producer sends one. */
      sample?: { players: number; shots: number; provisional?: boolean };
    }
  | { kind: "session"; label: string; band: [number, number] }
  | { kind: "published"; label: string; band: [number, number]; source?: string }
  | { kind: "none"; label: string };

export type MeasuredMetric = {
  /** Full name, e.g. "Front-foot stride". */
  name: string;
  /** Short axis label for tight layouts, e.g. "Stride". */
  short: string;
  /** The measured value, in `unit`. */
  value: number;
  unit: string;
  /** Decimal places for `value` and the reference band. */
  decimals: number;
  reference: MetricReference;
  direction: Direction;
  /**
   * Plain-English read, carrying the magnitude and the direction where there
   * is one — e.g. "8 cm shorter than your usual; the stride is repeatable".
   * Authored per metric rather than templated, so the coaching stays human.
   * Optional: a producer that has measurements but no defensible sentence to
   * write about them sends none, and the row simply ends at the scale.
   */
  note?: string;
  /**
   * Where the value lands in the reference population: the share of that
   * population's samples below it. Rendered as a plain rank beside the
   * reference, never as a score — `direction` already says which way is
   * better, and the scale already shows the position.
   */
  percentile?: { value: number; sample: { players: number; shots: number } };
  /**
   * One-line version of `note` for the pinned hero card, which shares the
   * viewport with the video and cannot afford three wrapped lines per row.
   * Falls back to `note` when absent.
   */
  noteShort?: string;
  /**
   * The same measurement from the player's most recent previous occasion —
   * the progress tracker. Derived platform-side from report history
   * (lib/report-measurements.ts), never sent by the worker.
   *
   * Carried on the model but not yet drawn: the row renders correctly without
   * it, so the history layer could land before the presentation for it does.
   */
  previous?: { value: number; label: string };
  /**
   * Bold lead word rendered before `note` — only ever a judgement the worker
   * itself made ("Needs work.") or a neutral fact. Never derived from the
   * band: descriptive metrics don't get verdicts the pipeline didn't emit.
   */
  lead?: string;
  /**
   * Change vs the previous occasion, as a small chip beside the value
   * ("▲ 4 cm"). `dir` is direction of travel, not a verdict — the chip stays
   * neutral because a longer stride is a fact, not an improvement.
   */
  deltaPill?: { text: string; dir: "up" | "down" | "same" };
};

/** The band, when the reference has one. */
export function referenceBand(metric: MeasuredMetric): [number, number] | null {
  return metric.reference.kind === "none" ? null : metric.reference.band;
}

/** Where the value sits relative to the reference band. */
export function bandStatus(metric: MeasuredMetric): "in" | "below" | "above" | "none" {
  const band = referenceBand(metric);
  if (!band) return "none";
  if (metric.value < band[0]) return "below";
  if (metric.value > band[1]) return "above";
  return "in";
}

/**
 * True when the player is on the wrong side of the band *and* the metric has a
 * direction worth flagging. Descriptive metrics never read as a fault.
 */
export function isOffReference(metric: MeasuredMetric): boolean {
  if (metric.direction === "none") return false;
  // An elite band is a target, not a pass mark. Falling short of the best in
  // the world is the normal state for a 15-year-old and must not read as a
  // failure — the gap is the point of showing it.
  if (metric.reference.kind === "elite") return false;
  const status = bandStatus(metric);
  if (status === "in" || status === "none") return false;
  if (metric.direction === "higher") return status === "below";
  if (metric.direction === "lower") return status === "above";
  return true;
}

import type { MeasuredMetric, MetricReference } from "@/components/measured-metric";
import type { ReportScores } from "@/lib/report-scores";
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

/**
 * The scoreboard hero's "one thing to fix": the worker judgement that read
 * worst this session, with a curated drill. Everything factual in it comes
 * from the payload (label counts); the drills are static coaching copy keyed
 * by metric, not generated claims.
 */
export type FocusArea = {
  /** e.g. "Your bat swing". */
  title: string;
  /** The honest observation, e.g. `7 of 12 balls read "needs work" for swing path.` */
  detail: string;
  /** Curated drill copy. */
  drill: string;
  /** What the next upload will re-measure, e.g. "swing path". */
  remeasure: string;
};

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

/**
 * Pro-comparison rows the worker attaches under `payload.pro_reference`
 * (pro_reference.py, cricket-ai-model) — kept separate from `measurements[]`
 * so it doesn't disable the session-derived rows below; merged onto a
 * matching row by key instead of replacing this module's output.
 */
type ProReferenceRow = {
  key: string;
  reference: Extract<MetricReference, { kind: "elite" }>;
  percentile?: { value: number; sample: { players: number; shots: number } };
};

/** Worker metric keys that differ from this module's BATTING_METRICS keys. */
const PRO_REFERENCE_KEY_ALIASES: Record<string, string> = {
  stride_length: "front_foot_stride",
  trigger_gap: "trigger_timing",
};

function parseSample(raw: unknown): { players: number; shots: number } | undefined {
  if (!isRecord(raw)) return undefined;
  const players = raw.players;
  const shots = raw.shots;
  if (typeof players !== "number" || typeof shots !== "number") return undefined;
  return { players, shots };
}

function parseProReference(payload: unknown): Map<string, ProReferenceRow> {
  const rows = new Map<string, ProReferenceRow>();
  if (!isRecord(payload) || !Array.isArray(payload.pro_reference)) return rows;

  for (const raw of payload.pro_reference) {
    if (!isRecord(raw) || typeof raw.key !== "string") continue;
    const ref = raw.reference;
    if (!isRecord(ref) || ref.kind !== "elite") continue;
    if (typeof ref.label !== "string" || !ref.label.trim()) continue;
    if (!Array.isArray(ref.band) || ref.band.length !== 2) continue;
    const [low, high] = ref.band;
    if (typeof low !== "number" || typeof high !== "number") continue;

    const row: ProReferenceRow = {
      key: raw.key,
      reference: {
        kind: "elite",
        label: ref.label,
        band: [low, high],
        source: typeof ref.source === "string" ? ref.source : undefined,
        sample: parseSample(ref.sample),
      },
    };

    if (isRecord(raw.percentile)) {
      const value = raw.percentile.value;
      const sample = parseSample(raw.percentile.sample);
      if (typeof value === "number" && sample) {
        row.percentile = { value: Math.round(value), sample };
      }
    }

    rows.set(raw.key, row);
  }
  return rows;
}

/** Same CV fields the renderers use for the headline repeatability figure. */
const CONSISTENCY_CV_FIELDS = [
  "stride_length_cv",
  "backlift_height_cv",
  "swing_straightness_mean_cv",
  "trigger_duration_cv",
  "trigger_gap_cv",
  "head_stability_frac_height_cv",
  "stance_ratio_cv",
] as const;

/**
 * Headline consistency (0-100) for one payload — the same mean-of-CVs figure
 * BattingReport shows, computable without parsing the full report. Null for
 * payloads with no consistency block (bowling: one delivery per video).
 */
export function payloadConsistency(payload: unknown): number | null {
  if (!isRecord(payload) || !isRecord(payload.consistency)) return null;
  const block = payload.consistency;
  const values = CONSISTENCY_CV_FIELDS.flatMap((field) => {
    const cv = block[field];
    if (typeof cv !== "number" || !Number.isFinite(cv)) return [];
    return [Math.round(100 * (1 - Math.min(Math.max(cv, 0), 1)))];
  });
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
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
 * Everything the scoreboard report derives from history: the measurement
 * rows, the headline-consistency trail feeding the hero cells and sessions
 * chart, and the focus block. Assembled by lib/report-history.ts.
 */
export type DerivedReport = {
  /** Empty when nothing in the clip measured in real units (uncalibrated). */
  metrics: MeasuredMetric[];
  /** Previous occasions' headline consistency, oldest first. */
  consistencyHistory: { date: Date; value: number }[];
  focus: FocusArea | null;
  /** The scoreboard numbers (lib/report-scores.ts); null when nothing was judged. */
  scores: ReportScores | null;
};

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

/**
 * Majority worker label for a per-shot judgement across the payload's shots
 * ("good" | "ok" | "needs work"), or null when fewer than half the shots carry
 * one. These are the labels the ball-by-ball detail already shows — surfacing
 * the majority at row level adds no new claim.
 */
function majorityShotLabel(
  payload: unknown,
  sectionKey: string,
  field: string,
): string | null {
  const shots = battingShots(payload);
  const counts = new Map<string, number>();
  for (const shot of shots) {
    const section = shot[sectionKey];
    const label = isRecord(section) ? section[field] : null;
    if (label === "good" || label === "ok" || label === "needs work") {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  let winner: string | null = null;
  let winnerCount = 0;
  for (const [label, count] of counts) {
    if (count > winnerCount) {
      winner = label;
      winnerCount = count;
    }
  }
  return winnerCount * 2 >= shots.length && shots.length > 0 ? winner : null;
}

/** Bold lead word for a row, from the worker's own labels only. */
const SHOT_LABEL_LEADS: Record<string, string> = {
  good: "Good.",
  ok: "Okay.",
  "needs work": "Needs work.",
};

const BRACE_LABEL_LEADS: Record<string, string> = {
  braced: "Braced.",
  "soft/absorbing": "Soft landing.",
  collapsing: "Collapsing.",
};

/** The worker judgement backing a metric row's lead, where one exists. */
function metricLead(payload: unknown, key: string): string | null {
  if (key === "head_movement") {
    const label = majorityShotLabel(payload, "head", "head_movement_label");
    return label ? SHOT_LABEL_LEADS[label] : null;
  }
  if (key === "front_knee_brace") {
    const delivery = isRecord(payload) ? payload.delivery : null;
    const brace = isRecord(delivery) ? delivery.front_knee_brace : null;
    const label = isRecord(brace) ? brace.brace_label : null;
    return typeof label === "string" ? (BRACE_LABEL_LEADS[label] ?? null) : null;
  }
  return null;
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

/**
 * The player's own range, or — on a first analysis — no band at all. A first
 * report used to invent a "last session" at 94 % of today's value so the row
 * had something to draw against; that is a fabricated number on the one
 * surface whose promise is that nothing is fabricated.
 */
function sessionReference(history: number[]): MetricReference {
  if (history.length === 0) {
    return { kind: "none", label: "First analysis" };
  }
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
  // Only batting carries a pro-comparison producer today (pro_reference.py);
  // bowling rows always fall through to the session band below.
  const proReference =
    shape === "batting" ? parseProReference(payload) : new Map<string, ProReferenceRow>();

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
    // A pro comparison, where the worker sent one for this metric, replaces
    // the session band on the row — the progress note/delta pill below still
    // come from the player's own history either way.
    const pro = proReference.get(PRO_REFERENCE_KEY_ALIASES[def.key] ?? def.key);
    if (pro) {
      row.reference = pro.reference;
      if (pro.percentile) row.percentile = pro.percentile;
    }
    const lead = metricLead(payload, def.key);
    if (lead) row.lead = lead;
    if (previous !== null) {
      row.previous = { value: previous, label: "Last session" };
      const delta = value - previous;
      row.deltaPill =
        Math.abs(delta) < def.sameWithin
          ? { text: "same", dir: "same" }
          : {
              text: `${delta > 0 ? "▲" : "▼"} ${withUnit(Math.abs(delta), def)}`,
              dir: delta > 0 ? "up" : "down",
            };
    }
    return [row];
  });

  return rows.length > 0 ? rows : null;
}

/**
 * The curated drill per fixable judgement. Static coaching copy — review it
 * like any other product copy; nothing in it is generated per player.
 */
const FOCUS_DRILLS: Record<
  string,
  { title: string; remeasure: string; drill: string }
> = {
  swing_label: {
    title: "Your bat swing",
    remeasure: "swing path",
    drill:
      "3 sets of 10 front-foot drives with a cone under your back heel. Stop the set the moment the swing bends — you are training the last few balls, not the first few.",
  },
  head_movement_label: {
    title: "Your head position",
    remeasure: "head movement",
    drill:
      "Throw-downs: hold your head dead still until the shot finishes. 3 sets of 10 — stop the set the moment your head starts chasing the ball.",
  },
  balance_label: {
    title: "Your balance",
    remeasure: "balance",
    drill:
      "Shadow 10 drives and freeze the finish for two full seconds — a wobble means the rep does not count. 3 sets.",
  },
  head_over_knee_label: {
    title: "Head over front knee",
    remeasure: "head position",
    drill:
      "Shadow drives with a stump just outside your front foot: finish every rep with your head over your front knee. 3 sets of 10.",
  },
  front_knee_brace: {
    title: "Your front knee",
    remeasure: "front-knee brace",
    drill:
      "Walk-through deliveries landing on a firm front leg. 3 sets of 6 — stop the set the moment the knee gives.",
  },
};

/** Judgements scanned for a focus, most coachable first (mirrors the mock). */
const BATTING_FOCUS_FIELDS: { section: string; field: string; label: string }[] = [
  { section: "swing", field: "swing_label", label: "swing path" },
  { section: "head", field: "head_movement_label", label: "head stillness" },
  { section: "balance", field: "balance_label", label: "balance" },
  { section: "head", field: "head_over_knee_label", label: "head over front knee" },
];

function battingFocusCounts(shots: Record<string, unknown>[]) {
  return BATTING_FOCUS_FIELDS.map(({ section, field, label }) => {
    const flagged = shots.filter((shot) => {
      const block = shot[section];
      return isRecord(block) && block[field] === "needs work";
    }).length;
    return { field, label, flagged };
  });
}

/**
 * "Fix this one thing": prefer a genuine majority "needs work", else the
 * loosest field, else the swing-path drill so the card always has a focus.
 */
export function deriveFocus(payload: unknown): FocusArea | null {
  const shape = reportShape(payload);
  if (shape === "batting") {
    const shots = battingShots(payload);
    if (shots.length === 0) return null;
    const counts = battingFocusCounts(shots);
    const majority = counts.find((row) => row.flagged * 2 >= shots.length && row.flagged > 0);
    const loosest = [...counts].sort((a, b) => b.flagged - a.flagged)[0];
    const picked = majority ?? (loosest.flagged > 0 ? loosest : counts[0]);
    const entry = FOCUS_DRILLS[picked.field];
    return {
      title: entry.title,
      detail:
        picked.flagged > 0
          ? `${picked.flagged} of ${shots.length} ball${shots.length === 1 ? "" : "s"} ${
              picked.flagged * 2 >= shots.length ? "read “needs work”" : "were the loose ones"
            } for ${picked.label}.`
          : "The one thing to protect next session — keep this locked so the rest of the technique holds.",
      drill: entry.drill,
      remeasure: entry.remeasure,
    };
  }
  if (shape === "bowling") {
    const delivery = isRecord(payload) ? payload.delivery : null;
    const brace = isRecord(delivery) ? delivery.front_knee_brace : null;
    const label = isRecord(brace) ? brace.brace_label : null;
    const entry = FOCUS_DRILLS.front_knee_brace;
    if (label === "collapsing" || label === "soft/absorbing") {
      return {
        title: entry.title,
        detail: `The front knee read “${label}” at landing on this delivery.`,
        drill: entry.drill,
        remeasure: entry.remeasure,
      };
    }
    return {
      title: entry.title,
      detail: "Keep the front leg firm — that's the thing that holds the rest of the action.",
      drill: entry.drill,
      remeasure: entry.remeasure,
    };
  }
  return null;
}

/** Fallback focus when the payload didn't produce one — keeps the card complete. */
export const FALLBACK_FOCUS: FocusArea = {
  title: "Your bat swing",
  detail: "The swing path is the one to lock in next session.",
  drill: FOCUS_DRILLS.swing_label.drill,
  remeasure: "swing path",
};

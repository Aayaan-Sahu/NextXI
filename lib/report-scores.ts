import { battingShots, median, readPath } from "@/lib/session-consistency";
import { reportShape, type ReportShape } from "@/lib/report-measurements";

/**
 * The scoreboard: the 0–100 numbers the home page's report card promises
 * ("82 of 100 · Good session · ▲ 6 on last session · Your 3 scores"), derived
 * from a v2 worker payload plus the player's own report history.
 *
 * The rule that keeps this honest — read it before changing a number:
 *
 *   A score is a judgement the worker already makes, at finer grain.
 *
 * The worker labels each shot "good" / "ok" / "needs work" by comparing one
 * measured scalar against two hand-picked thresholds (`score_label(value,
 * good, ok)` in cricket_analysis). Every score here is a continuous, monotone
 * map of that same scalar, anchored on those same two thresholds, so:
 *
 *   - score ≥ 70  ⇔  the worker's label is "good"
 *   - 60 ≤ score < 70  ⇔  "ok"
 *   - score < 60  ⇔  "needs work"
 *
 * A tile can therefore never contradict the ball-by-ball verdicts the report
 * already shows, and the session verdict thresholds the landing page uses
 * (≥ 85 great · ≥ 70 good · ≥ 60 solid · else keep building) line up with the
 * label bands instead of cutting across them. 100 means zero deviation (a
 * perfectly still head, a perfectly straight bat path, a knee that lands
 * straight and holds) — a physical ceiling, not a benchmark.
 *
 * What this deliberately is NOT: a comparison against any population. No
 * "elite" mark, no published band, no youth scaling — docs/BENCHMARKS.md is
 * binding here. The elite tick on the landing mock stays off the product
 * until the NextXI pro reference set exists (MODEL-STATUS.md Stage 2).
 *
 * The thresholds' own provenance is an open question (MODEL-STATUS.md Q7:
 * hand-picked in one commit, no coach sign-off). Re-calibrating them is a
 * two-number change per metric in the worker and in THRESHOLDS below — keep
 * the two in lockstep, and record where the new numbers come from.
 *
 * Only metrics the worker judges get a tile. Descriptive measurements
 * (stride length, back-foot depth, trigger timing, release height) have no
 * evidence-backed better/worse direction, so they stay rows, never scores.
 *
 * Pure; the Prisma query that feeds the history lives in lib/report-history.ts.
 */

export type ScoreBand = "good" | "ok" | "needs work";
export type Verdict = "great" | "good" | "solid" | "keep";

/** Score at the good/ok boundary and at the ok/needs-work boundary. */
export const GOOD_FROM = 70;
export const OK_FROM = 60;

/** Session verdict, same thresholds as the landing page's `verdictFor`. */
export function verdictFor(score: number): Verdict {
  if (score >= 85) return "great";
  if (score >= GOOD_FROM) return "good";
  if (score >= OK_FROM) return "solid";
  return "keep";
}

export function bandFor(score: number): ScoreBand {
  if (score >= GOOD_FROM) return "good";
  if (score >= OK_FROM) return "ok";
  return "needs work";
}

/** Two scores within this many points read as "about the same". */
export const SAME_WITHIN = 2;

export function changeKind(delta: number): "up" | "down" | "same" {
  if (Math.abs(delta) < SAME_WITHIN) return "same";
  return delta > 0 ? "up" : "down";
}

/**
 * Lower-is-better scalar against the worker's (good, ok) thresholds.
 * 0 → 100, good → 70, ok → 60, then a hyperbolic tail (60·ok/value) so twice
 * the limit reads 30 and the score never cliffs to 0 — a "needs work" ball is
 * still ranked against another "needs work" ball.
 */
export function scoreLowerIsBetter(value: number, good: number, ok: number): number {
  if (!(value > 0)) return 100;
  if (value < good) return 100 - (100 - GOOD_FROM) * (value / good);
  if (value < ok) return GOOD_FROM - (GOOD_FROM - OK_FROM) * ((value - good) / (ok - good));
  return OK_FROM * (ok / value);
}

/**
 * Higher-is-better scalar with a physical ceiling (`best`, e.g. 180° for a
 * straight leg). best → 100, good → 70, ok → 60, then linear to 0 at 0.
 */
export function scoreHigherIsBetter(
  value: number,
  good: number,
  ok: number,
  best: number,
): number {
  if (value >= best) return 100;
  if (value > good) return GOOD_FROM + (100 - GOOD_FROM) * ((value - good) / (best - good));
  if (value > ok) return OK_FROM + (GOOD_FROM - OK_FROM) * ((value - ok) / (good - ok));
  return Math.max(0, OK_FROM * (value / ok));
}

/**
 * When a payload carries only the label (older reports, or a shot the worker
 * could not measure continuously) the honest score is "somewhere in that
 * band": its midpoint.
 */
export const BANDED_SCORE: Record<ScoreBand, number> = {
  good: (GOOD_FROM + 100) / 2,
  ok: (OK_FROM + GOOD_FROM) / 2,
  "needs work": OK_FROM / 2,
};

/**
 * The worker's thresholds, byte-for-byte (cricket_analysis/batting.py
 * `_shot_payload`, batting_metrics.py `batting_metrics_for_event`,
 * bowling_metrics.py `front_leg_brace_label`). Stance-width units for
 * batting; degrees for bowling.
 */
export const THRESHOLDS = {
  head_movement: { good: 0.15, ok: 0.3 },
  bat_swing: { good: 0.1, ok: 0.2 },
  balance: { good: 0.25, ok: 0.4 },
  knee_landing_deg: { good: 155, ok: 140, best: 180 },
  knee_flexion_deg: { good: 5, ok: 15 },
} as const;

export type ScoreKey = "head_movement" | "bat_swing" | "balance" | "front_knee_brace";

export type ScoreTile = {
  key: ScoreKey;
  name: string;
  score: number;
  band: ScoreBand;
  /** Points vs the previous occasion's tile; null on a first analysis. */
  delta: number | null;
  /** "Needs work. Head moved 41 cm at most." — the verdict word, then a fact. */
  note: string;
  /** Instances (shots / deliveries) the score was measured on, of how many. */
  measured: number;
  total: number;
  /** True when only the worker's label was available and the band midpoint stands in. */
  banded: boolean;
};

/** One occasion's numbers, as stored for history. */
export type OccasionScores = {
  overall: number;
  tiles: Partial<Record<ScoreKey, number>>;
};

export type ReportScores = {
  score: number;
  previousScore: number | null;
  verdict: Verdict;
  tiles: ScoreTile[];
  /** Up to the last six occasions including today, oldest first. */
  history: { date: Date; score: number }[];
};

/** Occasions charted, today included. */
export const HISTORY_LENGTH = 6;

type Label = ScoreBand;

const LABEL_WORDS: Record<Label, string> = {
  good: "Good.",
  ok: "Okay.",
  "needs work": "Needs work.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function labelAt(instance: unknown, path: readonly string[]): Label | null {
  let current: unknown = instance;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return current === "good" || current === "ok" || current === "needs work" ? current : null;
}

function values(instances: unknown[], path: readonly string[]): number[] {
  return instances
    .map((instance) => readPath(instance, path))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
}

/** Majority label across instances, or null below half. */
function majorityLabel(instances: unknown[], path: readonly string[]): Label | null {
  const counts = new Map<Label, number>();
  for (const instance of instances) {
    const label = labelAt(instance, path);
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  let winner: Label | null = null;
  let winnerCount = 0;
  for (const [label, count] of counts) {
    if (count > winnerCount) {
      winner = label;
      winnerCount = count;
    }
  }
  return instances.length > 0 && winnerCount * 2 >= instances.length ? winner : null;
}

const fmt = (value: number, decimals: number) =>
  value.toFixed(decimals).replace(/\.0+$/, "");

type Scored = {
  score: number;
  measured: number;
  banded: boolean;
  /** Plain fact behind the number, already in real units where the clip calibrated. */
  fact: string;
};

const BATTING_TILES: { key: ScoreKey; name: string }[] = [
  { key: "head_movement", name: "Head movement" },
  { key: "bat_swing", name: "Bat swing" },
  { key: "balance", name: "Balance" },
];

const BOWLING_TILES: { key: ScoreKey; name: string }[] = [
  { key: "front_knee_brace", name: "Front-knee brace" },
];

function tilesFor(shape: ReportShape) {
  return shape === "batting" ? BATTING_TILES : BOWLING_TILES;
}

/** "on a typical ball" only when there was more than one to be typical of. */
function typical(count: number, noun: string): string {
  return count > 1 ? ` on a typical ${noun}` : "";
}

/**
 * Scores one lower-is-better batting judgement across shots: the median
 * normalised measure when the shots carry it, else the majority label.
 */
function scoreShots(
  shots: unknown[],
  measure: readonly string[],
  label: readonly string[],
  thresholds: { good: number; ok: number },
  fact: (measured: number) => string,
  labelFact: (label: Label) => string,
): Scored | null {
  const measured = values(shots, measure);
  if (measured.length > 0) {
    return {
      score: scoreLowerIsBetter(median(measured), thresholds.good, thresholds.ok),
      measured: measured.length,
      banded: false,
      fact: fact(measured.length),
    };
  }
  const majority = majorityLabel(shots, label);
  if (!majority) return null;
  return {
    score: BANDED_SCORE[majority],
    measured: shots.filter((shot) => labelAt(shot, label) !== null).length,
    banded: true,
    fact: labelFact(majority),
  };
}

function countLabel(shots: unknown[], path: readonly string[], label: Label): number {
  return shots.filter((shot) => labelAt(shot, path) === label).length;
}

function scoreBattingTile(key: ScoreKey, shots: unknown[]): Scored | null {
  const total = shots.length;
  const balls = (count: number) => `${count} of ${total} ball${total === 1 ? "" : "s"}`;

  if (key === "head_movement") {
    const cm = values(shots, ["head", "max_head_movement_cm"]);
    return scoreShots(
      shots,
      ["head", "max_head_movement_norm"],
      ["head", "head_movement_label"],
      THRESHOLDS.head_movement,
      (measured) =>
        cm.length > 0
          ? `Head moved ${fmt(median(cm), 0)} cm at most${typical(measured, "ball")}.`
          : `Head movement measured, but this clip didn't calibrate to centimetres.`,
      () => `Head still on ${balls(countLabel(shots, ["head", "head_movement_label"], "good"))}.`,
    );
  }

  if (key === "bat_swing") {
    const cm = values(shots, ["swing", "swing_deviation_cm"]);
    return scoreShots(
      shots,
      ["swing", "swing_straightness_mean"],
      ["swing", "swing_label"],
      THRESHOLDS.bat_swing,
      (measured) =>
        cm.length > 0
          ? `Bat came down ${fmt(median(cm), 1)} cm off straight${typical(measured, "ball")}.`
          : `Bat path measured, but this clip didn't calibrate to centimetres.`,
      () => `Bat path straight on ${balls(countLabel(shots, ["swing", "swing_label"], "good"))}.`,
    );
  }

  if (key === "balance") {
    const balanced = shots.filter(
      (shot) =>
        readBool(shot, ["balance", "head_inside_base"]) === true &&
        readBool(shot, ["balance", "hip_inside_base"]) === true,
    ).length;
    return scoreShots(
      shots,
      ["balance", "worst_base_offset_norm"],
      ["balance", "balance_label"],
      THRESHOLDS.balance,
      () => `Head and hips over the base at contact on ${balls(balanced)}.`,
      () => `Head and hips over the base at contact on ${balls(balanced)}.`,
    );
  }

  return null;
}

function readBool(instance: unknown, path: readonly string[]): boolean | null {
  let current: unknown = instance;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return typeof current === "boolean" ? current : null;
}

/**
 * The front-knee brace is the worker's one bowling judgement, and it is
 * two-sided: the knee must land straight enough AND hold to release. The
 * score is the weaker of the two, which is exactly how `front_leg_brace_label`
 * composes them ("collapsing" if either fails badly).
 */
function scoreBowlingBrace(deliveries: unknown[]): Scored | null {
  const landing = values(deliveries, ["delivery", "front_knee_brace", "landing_angle_deg"]);
  const release = values(deliveries, ["delivery", "front_knee_brace", "release_angle_deg"]);
  const total = deliveries.length;

  if (landing.length > 0 && release.length > 0) {
    const flexion = deliveries
      .map((delivery) => {
        const land = readPath(delivery, ["delivery", "front_knee_brace", "landing_angle_deg"]);
        const rel = readPath(delivery, ["delivery", "front_knee_brace", "release_angle_deg"]);
        return land === null || rel === null ? null : Math.max(0, land - rel);
      })
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b);
    const landingMedian = median(landing);
    const flexionMedian = median(flexion);
    const { knee_landing_deg: land, knee_flexion_deg: flex } = THRESHOLDS;
    return {
      score: Math.min(
        scoreHigherIsBetter(landingMedian, land.good, land.ok, land.best),
        scoreLowerIsBetter(flexionMedian, flex.good, flex.ok),
      ),
      measured: flexion.length,
      banded: false,
      fact: `Front knee ${fmt(landingMedian, 0)}° at landing, ${fmt(flexionMedian, 0)}° of give by release${typical(flexion.length, "delivery")}.`,
    };
  }

  // Label only.
  const counts = new Map<string, number>();
  for (const delivery of deliveries) {
    const raw =
      isRecord(delivery) && isRecord(delivery.delivery) && isRecord(delivery.delivery.front_knee_brace)
        ? delivery.delivery.front_knee_brace.brace_label
        : null;
    if (typeof raw === "string") counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  const braceBand: Record<string, Label> = {
    braced: "good",
    "soft/absorbing": "ok",
    collapsing: "needs work",
  };
  let winner: string | null = null;
  let winnerCount = 0;
  for (const [label, count] of counts) {
    if (count > winnerCount) {
      winner = label;
      winnerCount = count;
    }
  }
  if (!winner || winnerCount * 2 < total) return null;
  const band = braceBand[winner];
  if (!band) return null;
  return {
    score: BANDED_SCORE[band],
    measured: winnerCount,
    banded: true,
    fact: `The front knee read “${winner}” at landing${total > 1 ? ` on ${winnerCount} of ${total} deliveries` : ""}.`,
  };
}

/** Batting scores per shot; bowling once per payload (one delivery each). */
function instancesOf(shape: ReportShape, payloads: unknown[]): unknown[] {
  return shape === "batting" ? payloads.flatMap(battingShots) : payloads;
}

function scoreTile(shape: ReportShape, key: ScoreKey, instances: unknown[]): Scored | null {
  if (shape === "batting") return scoreBattingTile(key, instances);
  return key === "front_knee_brace" ? scoreBowlingBrace(instances) : null;
}

/**
 * Pools one filming occasion's ready payloads into its tile scores and the
 * session number (the rounded mean of the rounded tiles, so a reader can
 * check it against the tiles shown). Null when nothing in the occasion was
 * judged.
 */
export function occasionScores(shape: ReportShape, payloads: unknown[]): OccasionScores | null {
  const instances = instancesOf(shape, payloads);
  if (instances.length === 0) return null;
  const tiles: Partial<Record<ScoreKey, number>> = {};
  const rounded: number[] = [];
  for (const { key } of tilesFor(shape)) {
    const scored = scoreTile(shape, key, instances);
    if (!scored) continue;
    const score = Math.round(scored.score);
    tiles[key] = score;
    rounded.push(score);
  }
  if (rounded.length === 0) return null;
  return {
    overall: Math.round(rounded.reduce((sum, value) => sum + value, 0) / rounded.length),
    tiles,
  };
}

/**
 * Derives the scoreboard for one report. `history` is the player's previous
 * occasions of the same discipline, oldest first (lib/report-history.ts
 * groups them); `date` is when this report's clip was filmed. Returns null
 * for payloads that aren't a judged v2 shape (v1 legacy, v3 measurements,
 * `scored: false`, no shots).
 */
export function deriveScores(
  payload: unknown,
  history: { date: Date; scores: OccasionScores }[],
  date: Date,
): ReportScores | null {
  const shape = reportShape(payload);
  if (!shape) return null;

  const instances = instancesOf(shape, [payload]);
  const total = instances.length;
  if (total === 0) return null;

  const previous = history.length > 0 ? history[history.length - 1].scores : null;

  const tiles: ScoreTile[] = [];
  for (const { key, name } of tilesFor(shape)) {
    const scored = scoreTile(shape, key, instances);
    if (!scored) continue;
    const score = Math.round(scored.score);
    const prevTile = previous?.tiles[key];
    tiles.push({
      key,
      name,
      score,
      band: bandFor(score),
      delta: prevTile === undefined ? null : score - prevTile,
      note: `${LABEL_WORDS[bandFor(score)]} ${scored.fact}`,
      measured: scored.measured,
      total,
      banded: scored.banded,
    });
  }
  if (tiles.length === 0) return null;

  const score = Math.round(tiles.reduce((sum, tile) => sum + tile.score, 0) / tiles.length);
  const trail = history.slice(-(HISTORY_LENGTH - 1)).map(({ date: when, scores }) => ({
    date: when,
    score: scores.overall,
  }));

  return {
    score,
    previousScore: previous ? previous.overall : null,
    verdict: verdictFor(score),
    tiles,
    history: [...trail, { date, score }],
  };
}

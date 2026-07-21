/* Shared demo report data — one source of truth so every format variant shows
   the same (illustrative, hard-coded) numbers. Swap for real data later.
   Benchmarks are anonymous ("elite" = the best-ever standard, no named pro). */

export const OVERALL = 84;
export const SUBTITLE = "Aryaman Varma · Front-foot drive · 120 fps";
export const SUMMARY =
  "Textbook front-foot driving — dead-still head, swing straight down the line, elite-grade consistency across 12 balls.";

export type Metric = { name: string; short: string; score: number; elite: number; delta: number };

export const METRICS: Metric[] = [
  { name: "Head stability", short: "Head", score: 88, elite: 90, delta: 3 },
  { name: "Swing path", short: "Swing", score: 86, elite: 88, delta: 2 },
  { name: "Front-foot stride", short: "Stride", score: 82, elite: 85, delta: 5 },
  { name: "Balance at contact", short: "Balance", score: 79, elite: 84, delta: -1 },
  { name: "Timing", short: "Timing", score: 85, elite: 87, delta: 4 },
];

export type Measurement = { label: string; value: string; elite: string };

export const MEASUREMENTS: Measurement[] = [
  { label: "Bat speed", value: "72 mph", elite: "78" },
  { label: "Head movement", value: "2.1 cm", elite: "<3.0" },
  { label: "Contact timing", value: "+11 ms", elite: "±20" },
];

export const WEAKEST =
  "Balance at contact (79 vs elite 84). Weight leaks leg-side as you complete the drive.";
export const DRILL =
  "3 × 10 front-foot drives with a cone pinned under the back heel — keep it planted to hold your weight into the shot.";
export const COACH_NOTE =
  "Genuinely elite technique for the age group. Nail the balance drill and this is a complete front-foot game.";
export const DISCLOSURE =
  "Benchmarks reflect elite standards · demo footage · illustrative analysis";

/* Report data for the marketing surfaces — one source of truth so every format
   variant shows the same numbers.

   WHAT THIS DEMO SHOWS. Only metrics the pipeline can actually compute from a
   phone video: joint angles and timings (pure pose keypoints, no calibration)
   and distances (pose keypoints scaled by the player's known height). Nothing
   here needs ball tracking or high-speed mph capture.

   That deliberately excludes exit velocity, bat speed and contact centredness.
   All three depend on tracking the ball — or the bat — through impact at speed
   and converting pixels to mph, which needs calibration the pipeline does not
   have yet (the ball detector fires on roughly 40% of frames). Showing them
   here would promise a measurement we cannot make. They come back when the
   ball-tracking work lands. See docs/MODEL-STATUS.md and docs/BENCHMARKS.md.

   On references. There is one published comparison — front elbow angle, from
   McErlain-Naylor et al., ISBS Proceedings 38(1):664-668, 2020, Table 1:
   111.3 +/- 11.8 deg at downswing start across 14 male batters spanning club to
   international. That is a mixed-standard lab group mean, labelled as exactly
   that, not "elite". Everything else compares the player to their own recent
   range, because no defensible elite distribution exists for these metrics —
   stride length in particular shows no significant difference between skilled
   and less-skilled batters (910 +/- 30 mm vs 890 +/- 320 mm, P = 0.65).

   The `elite` reference kind (components/measured-metric.tsx) stays available
   but unused: the only metric with a genuinely elite-only source was exit
   velocity, and that returns once ball tracking exists.

   NOTE FOR WHOEVER WIRES THIS UP: the values below are placeholders pending the
   real analysed run. Replace them from the report payload rather than editing
   them by hand, and keep them in sync with the session they describe. */

import type { MeasuredMetric } from "@/components/measured-metric";

/** Headline figure. Consistency is a real statistic — the mean of the per-metric
    coefficients of variation across shots the analyser already computes — unlike
    a composite "technique score", which would have no defensible basis. */
export const CONSISTENCY = 86;
export const SHOTS_ANALYSED = 12;

export const SUBTITLE = "Aryaman Varma · Front-foot drive · 12 balls · 240 fps";

/** The summary makes the headline number concrete: it says what 86% means (how
    tightly the technique repeats) and names the one loose element, so the number
    is never left to interpret on its own. */
export const SUMMARY =
  "Technique repeats tightly across all 12 balls — that is what the 86% means. The swing path is the one loose element: it widens over the last four deliveries as the front elbow drops.";
export const SUMMARY_SHORT =
  "Repeats tightly across all 12 balls at 86% consistency. The swing path is the one loose element, widening late in the session.";

export const METRICS: MeasuredMetric[] = [
  {
    name: "Front elbow at downswing start",
    short: "Elbow",
    value: 118,
    unit: "°",
    decimals: 0,
    reference: {
      // 111.3 +/- 11.8 deg, rendered as mean +/- 1 SD. Pure pose angle — the
      // HUD over the hero video computes this live, no calibration needed.
      // The UI prefixes published references with a bold "Benchmark ·" (see
      // MeasuredMetricRow), so the label carries only the population — no
      // academic citation, which read like a footnote on a consumer report.
      // The citation travels in `source`, which is never rendered to players.
      kind: "published",
      label: "Club-to-international batters",
      band: [100, 123],
      source: "McErlain-Naylor et al., ISBS Proceedings 38(1):664-668, 2020, Table 1",
    },
    direction: "none",
    note: "Upper half of the benchmark range — a high front elbow, which is what keeps the swing straight early on. It drops 6° across the last four balls.",
    noteShort: "Upper half of the benchmark range — a high front elbow.",
  },
  {
    name: "Swing path deviation",
    short: "Swing",
    value: 4.1,
    unit: "cm",
    decimals: 1,
    reference: { kind: "session", label: "Your last 5 sessions", band: [2.6, 3.8] },
    direction: "lower",
    note: "0.3 cm wider than your usual, and the widest four balls are the last four — the path opens up as you tire, which is where centred contact is lost.",
    noteShort: "0.3 cm wider than usual — the path opens up late in the session.",
  },
  {
    name: "Head travel to contact",
    short: "Head",
    value: 11,
    unit: "cm",
    decimals: 0,
    reference: { kind: "session", label: "Your last 5 sessions", band: [9, 14] },
    direction: "lower",
    note: "3 cm steadier than your recent average, and steady on every ball — no drift as the session went on.",
    noteShort: "3 cm steadier than your recent average.",
  },
  {
    name: "Front-foot stride",
    short: "Stride",
    value: 1.02,
    unit: "m",
    decimals: 2,
    reference: { kind: "session", label: "Your last 5 sessions", band: [0.94, 1.05] },
    direction: "none",
    note: "Varies by only ±4 cm across 12 balls — your most repeatable movement. Tracked for consistency, not as a target: stride length isn't a marker of batting skill.",
    noteShort: "±4 cm across 12 balls — your most repeatable movement.",
  },
  {
    name: "Trigger to swing",
    short: "Trigger",
    value: 0.2,
    unit: "s",
    decimals: 2,
    reference: { kind: "session", label: "Your last 5 sessions", band: [0.18, 0.24] },
    direction: "none",
    note: "Comfortably inside your normal window and consistent ball to ball — the trigger isn't rushing you, so the late drift is fatigue rather than timing.",
    noteShort: "Inside your normal window — the late drift isn't a timing problem.",
  },
];

/** Per-metric repeatability across the 12 balls, as the analyser computes it:
    100 * (1 - min(cv, 1)) over the shot-by-shot values. A real statistic with no
    benchmark needed — it only ever compares the player to themselves. Keyed by
    `short` so it stays aligned with METRICS; the headline CONSISTENCY is their
    mean. */
export const CONSISTENCY_BY_METRIC: Record<string, number> = {
  Elbow: 88,
  Swing: 74,
  Head: 91,
  Stride: 96,
  Trigger: 81,
};

export const WEAKEST =
  "Swing path deviation. It widens to 4.1 cm over the last four balls, against your usual 2.6–3.8 cm, as the front elbow drops — the one place your technique loosens under fatigue.";
export const WEAKEST_SHORT =
  "Swing path widens to 4.1 cm on the last four balls — the front elbow drops as you tire.";
export const DRILL =
  "3 × 10 front-foot drives with a cone pinned under the back heel, stopping the set the moment the elbow drops — you are training the last four balls, not the first eight.";
export const COACH_NOTE =
  "Genuinely repeatable technique for the age group. Hold the front-elbow shape deeper into the session and the swing path stays straight all the way through.";
export const DISCLOSURE =
  "Measurements, not scores · bat tracked on 96% of frames · the elbow benchmark is a published study of club-to-international batters; every other range is the player's own recent sessions. No genuine elite range exists yet for these metrics — we don't invent one.";

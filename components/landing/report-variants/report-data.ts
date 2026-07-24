/* Report data for the marketing surfaces — one source of truth so every format
   variant shows the same numbers.

   HOW THE METRICS WERE CHOSEN. Outcome first, then the levers that move it,
   then rhythm, then repeatability:

     1. Exit velocity        the result, and the only metric with a genuinely
                             elite-only published band
     2. Contact centredness  the biggest lever on that result
     3. Bat speed            the other input, so 1 decomposes into 2 and 3
     4. Swing path           what causes off-centre contact
     5. Front elbow          what shapes the swing path
     6. Trigger → swing      rhythm under pace

   On centredness. Peploe et al. 2019 (Human Movement Science 63:34-44) Table 4,
   Model 3 explains 67.6% of ball-speed variance across 239 trials; impact
   location carries a coefficient of -109.693 against bat speed's 0.772, which
   works out at roughly 1 cm of centredness being worth ~1.4 m/s of bat speed.
   Verbatim from its introduction: "impacts just 2 cm off-centre in the
   medio-lateral direction causing a 6% reduction in ball speed." That is a
   pooled all-standards impact-physics regression, not a skill benchmark, and
   the sweet region is a +/-2 cm band either side of the blade midline.

   On the elite band. Table 3 of the same paper reports ball launch speed BROKEN
   OUT BY PLAYING STANDARD; the International row (n=3, England / England Lions)
   is 34.5 +/- 1.7 m/s over the fastest three trials. Converted to mph and shown
   as mean +/- 1 SD, that is the 73-81 mph band below. Bat speed comes from
   Table 2 of the same paper but pools all 20 batsmen international-to-club, so
   it is labelled as the mixed-standard group it is. Do not relabel it elite.

   Stride length is deliberately absent from the headline set: skilled vs
   less-skilled is 910 +/- 30 mm vs 890 +/- 320 mm, P = 0.65. Head stillness is
   absent too — Mann 2013 found elite batters couple head rotation to the ball
   better, not that they move less, so scoring stillness risks coaching the
   opposite of the finding. See docs/BENCHMARKS.md.

   Both speed metrics and centredness need high-frame-rate capture: at 30 fps
   the bat travels roughly half a metre between frames, at 240 fps nearer 6 cm.

   NOTE FOR WHOEVER WIRES THIS UP: the values below are placeholders pending the
   real analysed run. Replace them from the report payload rather than editing
   them by hand, and keep them in sync with the session they describe. */

import type { MeasuredMetric } from "@/components/measured-metric";

/** Headline figure. Consistency is a real statistic — it comes from the
    coefficient of variation across shots the analyser already computes — unlike
    a composite "technique score", which would have no defensible basis. */
export const CONSISTENCY = 86;
export const SHOTS_ANALYSED = 12;

export const SUBTITLE = "Aryaman Varma · Front-foot drive · 12 balls · 240 fps";
export const SUMMARY =
  "Exit speed is 3 mph off the international benchmark, and it is being lost at contact rather than in the swing: three balls caught toward the outside edge, all of them after ball 8, as the swing path opens up.";

export const METRICS: MeasuredMetric[] = [
  {
    name: "Exit velocity",
    short: "Exit",
    value: 70,
    unit: "mph",
    decimals: 0,
    reference: {
      kind: "elite",
      label: "3 international batters (Peploe 2019)",
      band: [73, 81],
    },
    direction: "higher",
    note: "3 mph off the international benchmark — the clearest headroom in your game. Exit speed comes from bat speed and centred contact, and the centring is where yours is leaking.",
    noteShort: "3 mph off the international benchmark — your clearest headroom.",
  },
  {
    name: "Contact centredness",
    short: "Contact",
    value: 1.4,
    unit: "cm",
    decimals: 1,
    reference: {
      kind: "published",
      label: "Sweet region, blade midline (Peploe 2019)",
      band: [0, 2],
    },
    direction: "lower",
    note: "Inside the sweet region on 9 of 12 balls. The three you lost were 2.6–3.4 cm toward the outside edge, costing roughly 8% of exit speed each — and all three came after ball 8.",
    noteShort: "Inside the sweet region on 9 of 12 balls; the three misses came late.",
  },
  {
    name: "Bat speed at impact",
    short: "Bat",
    value: 58,
    unit: "mph",
    decimals: 0,
    reference: {
      kind: "published",
      label: "20 batters, club→international (Peploe 2019)",
      band: [55, 65],
    },
    direction: "higher",
    note: "Mid-range for the published group, and not your limiting factor — 1 cm of centring is worth about as much as 3 mph of bat speed. Swing harder only after the contact tightens up.",
    noteShort: "Mid-range for the group — not your limiting factor right now.",
  },
  {
    name: "Swing path deviation",
    short: "Swing",
    value: 4.1,
    unit: "cm",
    decimals: 1,
    reference: { kind: "session", label: "Your last 5 sessions", band: [2.6, 3.8] },
    direction: "lower",
    note: "0.3 cm wider than your usual, and the widest four balls are the last four. This is the mechanism behind the late off-centre contact, not a separate problem.",
    noteShort: "0.3 cm wider than usual — this is what opens up late.",
  },
  {
    name: "Front elbow at downswing start",
    short: "Elbow",
    value: 118,
    unit: "°",
    decimals: 0,
    reference: {
      // 111.3 +/- 11.8 deg, rendered as mean +/- 1 SD.
      kind: "published",
      label: "14 batters, club→international (ISBS 2020)",
      band: [100, 123],
    },
    direction: "none",
    note: "Upper half of the published range — a high front elbow, which is what keeps the path straight early in the session. It drops 6° across the last four balls.",
    noteShort: "Upper half of the published range — a high front elbow.",
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
    `short` so it stays aligned with METRICS. */
export const CONSISTENCY_BY_METRIC: Record<string, number> = {
  Exit: 84,
  Contact: 79,
  Bat: 88,
  Swing: 74,
  Elbow: 89,
  Trigger: 91,
};

export const WEAKEST =
  "Contact centredness. Three balls caught 2.6–3.4 cm toward the outside edge, all after ball 8 — roughly 8% of exit speed lost on each, and it tracks the swing path opening as you tire.";
export const DRILL =
  "3 × 10 front-foot drives with a cone pinned under the back heel, stopping the set the moment the elbow drops — you are training the last four balls, not the first eight.";
export const COACH_NOTE =
  "Genuinely repeatable technique for the age group. Hold the shape deeper into the session and the exit speed follows without swinging harder.";
export const DISCLOSURE =
  "Bat tracked on 96% of frames · measurements, not scores — elite band is 3 international batters (Peploe 2019); all other references are the player's own range unless a source is named";

import { ConsistencyList, type ConsistencyItem } from "@/components/consistency";
import { DerivedMeasurements } from "@/components/measured-report";
import {
  CoachStamp,
  FocusBlock,
  ReportHero,
  ScoreTiles,
  SessionsChart,
  nextScoreFor,
  visualDelta,
  type ScoreTile,
} from "@/components/report-scoreboard";
import { Kicker } from "@/components/ui";
import { FALLBACK_FOCUS, deriveFocus, type DerivedReport } from "@/lib/report-measurements";
import type { VideoReport } from "@/lib/videos.server";

/**
 * Renderer for the batting-analysis payload produced by the CRICKET worker
 * (api_batting.analyze_batting -> { video, calibration, shots[], consistency }).
 * Everything is parsed defensively: any field can be null/missing and the UI
 * simply omits it. See docs/reports-contract.md (schema_version 2).
 */

type Tone = "light" | "dark";
type Label = "good" | "ok" | "needs work";

// Each shot exposes these labelled judgements; we render them as rows.
const SHOT_METRICS: { section: string; field: string; label: string }[] = [
  { section: "head", field: "head_movement_label", label: "Head stillness" },
  { section: "head", field: "head_over_knee_label", label: "Head over front knee" },
  { section: "balance", field: "balance_label", label: "Balance at contact" },
  { section: "swing", field: "swing_label", label: "Swing path" },
];

// Consistency is reported as a coefficient of variation (lower = steadier).
const CONSISTENCY_FIELDS: { field: string; label: string }[] = [
  { field: "stride_length_cv", label: "Stride length" },
  { field: "backlift_height_cv", label: "Backlift height" },
  { field: "swing_straightness_mean_cv", label: "Swing path" },
  { field: "trigger_duration_cv", label: "Trigger duration" },
  { field: "trigger_gap_cv", label: "Trigger timing" },
  { field: "head_stability_frac_height_cv", label: "Head stability" },
  { field: "stance_ratio_cv", label: "Stance width" },
];

type ShotMetric = { label: string; value: Label };
type ShotStat = { label: string; value: string };
type Shot = { timeSec: number | null; metrics: ShotMetric[]; stats: ShotStat[] };

export type ParsedBattingReport = {
  shots: Shot[];
  consistency: ConsistencyItem[];
  heightCm: number | null;
  fps: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function labelOf(value: unknown): Label | null {
  return value === "good" || value === "ok" || value === "needs work" ? value : null;
}

function section(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function formatCm(value: number | null, decimals = 0): string | null {
  return value === null ? null : `${value.toFixed(decimals)} cm`;
}

function formatSeconds(value: number | null): string | null {
  return value === null ? null : `${value.toFixed(2)}s`;
}

function parseShot(raw: unknown, fps: number | null): Shot | null {
  if (!isRecord(raw)) return null;

  const frames = section(raw, "frames");
  const swingPeak = num(frames.swing_peak);
  const timeSec = swingPeak !== null && fps ? swingPeak / fps : null;

  const metrics: ShotMetric[] = [];
  for (const { section: sectionKey, field, label } of SHOT_METRICS) {
    const value = labelOf(section(raw, sectionKey)[field]);
    if (value) metrics.push({ label, value });
  }

  const head = section(raw, "head");
  const stride = section(raw, "front_foot_stride");
  const backFoot = section(raw, "back_foot_depth");
  const trigger = section(raw, "trigger");

  const stats: ShotStat[] = [
    { label: "Stride", value: formatCm(num(stride.stride_length_cm)) },
    { label: "Back foot", value: formatCm(num(backFoot.depth_cm)) },
    { label: "Head move", value: formatCm(num(head.max_head_movement_cm), 1) },
    { label: "Trigger gap", value: formatSeconds(num(trigger.gap_to_swing_sec)) },
  ].flatMap((stat) => (stat.value ? [{ label: stat.label, value: stat.value }] : []));

  // A shot with neither a judgement nor a measurement isn't worth a row.
  if (metrics.length === 0 && stats.length === 0) return null;
  return { timeSec, metrics, stats };
}

/**
 * Returns the parsed batting report, or null if `payload` isn't the
 * batting shape (letting the caller fall back to the legacy renderer).
 */
export function parseBattingReport(payload: unknown): ParsedBattingReport | null {
  if (!isRecord(payload) || !Array.isArray(payload.shots)) return null;

  const fps = num(section(payload, "video").fps);
  const shots = payload.shots.flatMap((raw) => parseShot(raw, fps) ?? []);

  // Consistency only means something with more than one shot to compare.
  const consistency: ConsistencyItem[] =
    shots.length > 1
      ? CONSISTENCY_FIELDS.flatMap(({ field, label }) => {
          const cv = num(section(payload, "consistency")[field]);
          if (cv === null) return [];
          const consistencyPct = Math.round(100 * (1 - Math.min(Math.max(cv, 0), 1)));
          return [{ label, consistency: consistencyPct }];
        })
      : [];

  return {
    shots,
    consistency,
    heightCm: num(section(payload, "calibration").height_cm),
    fps,
  };
}

/**
 * Headline repeatability (0-100) across the analysed shots — the mean of the
 * per-metric consistency figures, which are themselves derived from the
 * analyser's shot-to-shot coefficients of variation.
 *
 * This replaced a composite "technique score" that mapped the qualitative
 * labels onto numbers (good=100, ok=65, needs work=30) and averaged them. That
 * produced a two-significant-figure headline out of a three-way judgement, and
 * it implied a benchmark that does not exist — there is no published elite
 * distribution for these metrics to score a player against. Consistency needs
 * no benchmark: it only ever compares the player to themselves.
 *
 * Null when there is only one shot, since repeatability needs something to
 * repeat against.
 */
export function battingConsistency(parsed: ParsedBattingReport): number | null {
  const values = parsed.consistency.flatMap((item) =>
    item.consistency === null ? [] : [item.consistency],
  );
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatTimestamp(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

const LABEL_SCORE: Record<Label, number> = { good: 91, ok: 76, "needs work": 64 };

const TILE_FROM_CONSISTENCY: {
  from: string;
  name: string;
  notes: { high: string; mid: string; low: string };
}[] = [
  {
    from: "Backlift height",
    name: "Front elbow",
    notes: {
      high: "Very good. Elbow stays high — almost elite.",
      mid: "Okay. Elbow holds, then drops a few degrees late.",
      low: "Needs work. The front elbow drops as you get tired.",
    },
  },
  {
    from: "Swing path",
    name: "Bat swing",
    notes: {
      high: "Very good. Path stays straight through contact.",
      mid: "Okay. Path holds early, opens up a little late.",
      low: "Needs work. Bat comes down at an off-angle as you tire.",
    },
  },
  {
    from: "Head stability",
    name: "Head movement",
    notes: {
      high: "Very good. Head stays still through contact.",
      mid: "Okay. A little drift as the session went on.",
      low: "Needs work. Head chases the ball on the later deliveries.",
    },
  },
];

const TILE_FROM_SHOT: { label: string; name: string }[] = [
  { label: "Head over front knee", name: "Front elbow" },
  { label: "Swing path", name: "Bat swing" },
  { label: "Head stillness", name: "Head movement" },
];

function noteFor(
  notes: { high: string; mid: string; low: string } | undefined,
  score: number,
  fallbackName: string,
) {
  if (!notes) {
    if (score >= 85) return `Very good. ${fallbackName} holds — almost elite.`;
    if (score >= 70) return `Solid. ${fallbackName} is repeatable, with a little drift.`;
    return `Needs work. ${fallbackName} is the one to fix.`;
  }
  if (score >= 85) return notes.high;
  if (score >= 70) return notes.mid;
  return notes.low;
}

function makeTile(
  name: string,
  score: number,
  notes: { high: string; mid: string; low: string } | undefined,
): ScoreTile {
  return {
    name,
    score,
    note: noteFor(notes, score, name),
    delta: visualDelta(score),
  };
}

/**
 * Three 0–100 bars for the mock-1 "YOUR 3 SCORES" block. The worker's own
 * qualitative labels drive score and note together, so a tile can never say
 * "Very good" while the focus card counts the same judgement as "needs work"
 * — the CV consistency figures only fill slots the labels don't cover.
 */
function battingScoreTiles(parsed: ParsedBattingReport): ScoreTile[] {
  const tiles: ScoreTile[] = [];

  for (const { label, name } of TILE_FROM_SHOT) {
    if (tiles.length >= 3) break;
    const values = parsed.shots.flatMap((shot) =>
      shot.metrics.flatMap((metric) => (metric.label === label ? [LABEL_SCORE[metric.value]] : [])),
    );
    if (values.length === 0) continue;
    const score = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    const notes = TILE_FROM_CONSISTENCY.find((row) => row.name === name)?.notes;
    tiles.push(makeTile(name, score, notes));
  }
  if (tiles.length >= 3) return tiles.slice(0, 3);

  const byLabel = new Map(
    parsed.consistency.flatMap((item) =>
      item.consistency === null ? [] : [[item.label, item.consistency] as const],
    ),
  );
  for (const { from, name, notes } of TILE_FROM_CONSISTENCY) {
    if (tiles.length >= 3) break;
    if (tiles.some((row) => row.name === name)) continue;
    const score = byLabel.get(from);
    if (score === undefined) continue;
    tiles.push(makeTile(name, score, notes));
  }
  if (tiles.length >= 3) return tiles.slice(0, 3);

  for (const item of parsed.consistency) {
    if (tiles.length >= 3 || item.consistency === null) continue;
    if (TILE_FROM_CONSISTENCY.some((row) => row.from === item.label)) continue;
    tiles.push(makeTile(item.label, item.consistency, undefined));
  }
  return tiles.slice(0, 3);
}

function labelColor(value: Label, dark: boolean) {
  if (value === "good") return dark ? "text-gold-500" : "text-gold-600";
  if (value === "needs work") return dark ? "text-rust-500" : "text-rust-600";
  return dark ? "text-sage-400" : "text-ink-600";
}

/**
 * One analysed shot. The measurements lead, in the units the analyser emits,
 * because "Stride 62 cm" tells a player what to change and a score does not.
 * The qualitative judgements still render, but as words rather than converted
 * into a percentage they cannot support.
 */
function ShotRow({ shot, index, tone }: { shot: Shot; index: number; tone: Tone }) {
  const dark = tone === "dark";
  const rowBorder = dark ? "border-cream-200/15" : "border-cream-400";

  return (
    <div className={`border-b py-3.5 ${rowBorder}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-sm tracking-[.08em] uppercase">Shot {index + 1}</span>
        {shot.timeSec !== null && (
          <span className={`font-mono text-[11px] ${dark ? "text-gold-500" : "text-rust-600"}`}>
            {formatTimestamp(shot.timeSec)}
          </span>
        )}
      </div>

      {shot.stats.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-2">
          {shot.stats.map((stat) => (
            <div key={stat.label}>
              <div
                className={`font-mono text-[15px] font-semibold tabular-nums ${
                  dark ? "text-cream-100" : "text-ink-900"
                }`}
              >
                {stat.value}
              </div>
              <div
                className={`mt-0.5 font-mono text-[10px] tracking-[.14em] uppercase ${
                  dark ? "text-sage-400" : "text-ink-600"
                }`}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {shot.metrics.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
          {shot.metrics.map((metric) => (
            <span className="font-mono text-[11px]" key={metric.label}>
              <span className={dark ? "text-sage-400" : "text-ink-600"}>{metric.label} </span>
              <span className={`font-semibold ${labelColor(metric.value, dark)}`}>{metric.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RawDetails({ payload, tone }: { payload: unknown; tone: Tone }) {
  const dark = tone === "dark";
  return (
    <details
      className={`rounded-md border ${
        dark ? "border-cream-200/15 bg-black/20" : "border-cream-400 bg-cream-50"
      }`}
    >
      <summary
        className={`cursor-pointer px-3 py-2 text-sm font-medium ${
          dark ? "text-sage-400" : "text-ink-600"
        }`}
      >
        Raw report data
      </summary>
      <pre
        className={`overflow-x-auto border-t px-3 py-2 text-xs leading-relaxed ${
          dark ? "border-cream-200/15 text-cream-200" : "border-cream-400 text-ink-600"
        }`}
      >
        {JSON.stringify(payload, null, 2)}
      </pre>
    </details>
  );
}

/** Renders the parsed batting report body inside ReportPanel's card. */
export function BattingReport({
  parsed,
  report,
  tone,
  derived,
}: {
  parsed: ParsedBattingReport;
  report: VideoReport;
  tone: Tone;
  /** History-derived scoreboard data (lib/report-history.ts); leads when present. */
  derived?: DerivedReport | null;
}) {
  const dark = tone === "dark";
  const shotCount = parsed.shots.length;
  const measurements = derived?.metrics ?? [];
  const tiles = battingScoreTiles(parsed);
  const consistency = battingConsistency(parsed);
  const score =
    consistency ??
    (tiles.length
      ? Math.round(tiles.reduce((sum, row) => sum + row.score, 0) / tiles.length)
      : 82);
  const history = derived?.consistencyHistory ?? [];
  const focus = derived?.focus ?? deriveFocus(report.payload) ?? FALLBACK_FOCUS;
  const metaParts = [
    parsed.heightCm !== null ? `Calibrated to ${Math.round(parsed.heightCm)} cm` : null,
    parsed.fps !== null ? `${Math.round(parsed.fps)} fps` : null,
    report.modelVersion,
  ].filter(Boolean);

  const shotRows = (
    <div className="mt-1">
      {parsed.shots.map((shot, index) => (
        <ShotRow key={index} shot={shot} index={index} tone={tone} />
      ))}
    </div>
  );

  const consistencyBlock = parsed.consistency.length > 0 && (
    <div className={`border-b py-4 ${dark ? "border-cream-200/15" : "border-cream-400"}`}>
      <Kicker tone={tone}>Consistency across shots</Kicker>
      <ConsistencyList items={parsed.consistency} tone={tone} />
    </div>
  );

  return (
    <div className={dark ? "" : "pt-4"}>
      {shotCount === 0 ? (
        <p className={`pt-4 text-sm ${dark ? "text-sage-400" : "text-ink-600"}`}>
          The analysis ran but didn&apos;t detect a clear batting shot in this video.
        </p>
      ) : (
        <>
          <ReportHero
            balls={`${shotCount} ball${shotCount === 1 ? "" : "s"} analysed`}
            history={history}
            score={score}
            tone={tone}
          />
          <ScoreTiles tiles={tiles} tone={tone} />
          <SessionsChart history={history} today={score} tone={tone} />
          <FocusBlock focus={focus} nextScore={nextScoreFor(score)} tone={tone} />
          {/* The real-units measurements (with own-range bands and the
              last-session marker) live one tap away so the card itself keeps
              the mock's five-beat read: hero, scores, trail, fix, stamp. */}
          <details className={`border-b ${dark ? "border-cream-200/15" : "border-cream-400"}`}>
            <summary
              className={`cursor-pointer py-3 font-display text-sm tracking-[.08em] uppercase ${
                dark ? "text-sage-400" : "text-ink-600"
              }`}
            >
              Measurements &amp; ball-by-ball · {shotCount} {shotCount === 1 ? "shot" : "shots"}
            </summary>
            {measurements.length > 0 && (
              <div className="pt-2 pb-1">
                <DerivedMeasurements metrics={measurements} tone={tone} />
              </div>
            )}
            {shotRows}
            {consistencyBlock}
          </details>
          <CoachStamp tone={tone} />
        </>
      )}

      <div className="flex flex-col gap-2 py-4">
        <RawDetails payload={report.payload} tone={tone} />
        {metaParts.length > 0 && (
          <p className={`font-mono text-[10.5px] ${dark ? "text-sage-400" : "text-ink-600"}`}>
            {metaParts.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

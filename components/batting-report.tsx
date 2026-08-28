import type { ConsistencyItem } from "@/components/consistency";
import {
  ConsistencyRow,
  RawDetails,
  ReportMeta,
  ShotStat,
  VerdictRow,
} from "@/components/report-panel";
import { SeekButton } from "@/components/seek-button";
import { SectionHeading } from "@/components/ui";
import type { VideoReport } from "@/lib/videos.server";

/**
 * Renderer for the batting-analysis payload produced by the CRICKET worker
 * (api_batting.analyze_batting -> { video, calibration, shots[], consistency }).
 * Everything is parsed defensively: any field can be null/missing and the UI
 * simply omits it. See docs/reports-contract.md (schema_version 2).
 */

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
type Shot = {
  /** Position in the payload's `shots[]` — the number the row and the player's moments rail share. */
  index: number;
  timeSec: number | null;
  metrics: ShotMetric[];
  stats: ShotStat[];
};

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

function parseShot(raw: unknown, fps: number | null, index: number): Shot | null {
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
  return { index, timeSec, metrics, stats };
}

/**
 * Returns the parsed batting report, or null if `payload` isn't the
 * batting shape (letting the caller fall back to the legacy renderer).
 */
export function parseBattingReport(payload: unknown): ParsedBattingReport | null {
  if (!isRecord(payload) || !Array.isArray(payload.shots)) return null;

  const fps = num(section(payload, "video").fps);
  const shots = payload.shots.flatMap((raw, index) => parseShot(raw, fps, index) ?? []);

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

/**
 * One analysed shot. The measurements lead, in the units the analyser emits,
 * because "Stride 62 cm" tells a player what to change and a score does not.
 * The qualitative judgements still render, but as words rather than converted
 * into a percentage they cannot support.
 */
function ShotRow({ shot, variation }: { shot: Shot; variation?: string }) {
  return (
    <div className="border-t border-cream-300 py-[18px]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-title font-semibold tracking-[.02em] uppercase">
          Shot {shot.index + 1}
          {variation ? ` · ${variation}` : ""}
        </h3>
        {/* Live when the page has a player: jumps the clip to the swing. */}
        {shot.timeSec !== null && <SeekButton t={shot.timeSec} />}
      </div>

      {shot.stats.length > 0 && (
        <div className="mt-3.5 grid grid-cols-4 gap-3 max-sm:grid-cols-2">
          {shot.stats.map((stat) => (
            <ShotStat key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      )}

      {shot.metrics.length > 0 && (
        <div className="mt-4">
          {shot.metrics.map((metric) => (
            <VerdictRow key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders the parsed batting report body inside ReportPanel's card. */
export function BattingReport({
  parsed,
  report,
}: {
  parsed: ParsedBattingReport;
  report: VideoReport;
}) {
  const shotCount = parsed.shots.length;
  const metaParts = [
    parsed.heightCm !== null ? `Calibrated to ${Math.round(parsed.heightCm)} cm` : null,
    parsed.fps !== null ? `${Math.round(parsed.fps)} fps` : null,
    report.modelVersion,
  ];

  if (shotCount === 0) {
    return (
      <>
        <p className="text-body leading-relaxed text-ink-800">
          The analysis ran but didn&apos;t detect a clear batting shot in this video.
        </p>
        <RawDetails payload={report.payload} />
        <ReportMeta parts={metaParts} />
      </>
    );
  }

  return (
    <>
      {parsed.shots.map((shot) => (
        <ShotRow key={shot.index} shot={shot} />
      ))}

      {parsed.consistency.length > 0 && (
        <div className="border-t border-cream-300 pt-[18px]">
          <SectionHeading as="h3">Consistency across shots</SectionHeading>
          <div className="mt-3.5 grid gap-3">
            {parsed.consistency.map((item) => (
              <ConsistencyRow key={item.label} label={item.label} value={item.consistency} />
            ))}
          </div>
          <p className="mt-3 text-caption leading-relaxed text-ink-600">
            — not enough comparable data across these shots to score reliably.
          </p>
        </div>
      )}

      <RawDetails payload={report.payload} />
      <ReportMeta parts={metaParts} />
    </>
  );
}

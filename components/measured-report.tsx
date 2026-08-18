import {
  MeasuredMetricRow,
  MeasurementsIntro,
  type Direction,
  type MeasuredMetric,
  type MetricReference,
  type Tone,
} from "@/components/measured-metric";
import type { VideoReport } from "@/lib/videos.server";

/**
 * v3 measurements path for ReportPanel. When the payload carries a
 * `measurements` array, the product report uses the same MeasuredMetricRow
 * renderer as the landing demo — so marketing and dashboard cannot drift.
 *
 * See docs/reports-contract.md (schema_version 3).
 */

export type ParsedMeasuredReport = {
  metrics: MeasuredMetric[];
  /** False when coverage says there wasn't enough signal to score honestly. */
  scored: boolean;
  heightCm: number | null;
  fps: number | null;
  consistency: number | null;
};

const DIRECTIONS = new Set<Direction>(["higher", "lower", "inside", "none"]);
const REF_KINDS = new Set(["session", "published", "elite", "none"]);

/** Same CV fields the batting renderer uses — shared so the headline figure
    never disagrees between v2 shot lists and v3 measurement rows. */
const CONSISTENCY_FIELDS = [
  "stride_length_cv",
  "backlift_height_cv",
  "swing_straightness_mean_cv",
  "trigger_duration_cv",
  "trigger_gap_cv",
  "head_stability_frac_height_cv",
  "stance_ratio_cv",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function section(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function parseBand(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const low = num(value[0]);
  const high = num(value[1]);
  if (low === null || high === null) return null;
  return [low, high];
}

/** { players, shots } when both are finite — the reference population's size. */
function parseSample(raw: unknown): { players: number; shots: number } | undefined {
  if (!isRecord(raw)) return undefined;
  const players = num(raw.players);
  const shots = num(raw.shots);
  if (players === null || shots === null) return undefined;
  return { players, shots };
}

function parseReference(raw: unknown): MetricReference | null {
  if (!isRecord(raw) || typeof raw.kind !== "string" || !REF_KINDS.has(raw.kind)) {
    return null;
  }
  if (typeof raw.label !== "string" || !raw.label.trim()) return null;

  if (raw.kind === "none") {
    return { kind: "none", label: raw.label };
  }

  const band = parseBand(raw.band);
  if (!band) return null;

  if (raw.kind === "session") {
    return { kind: "session", label: raw.label, band };
  }

  const source = typeof raw.source === "string" ? raw.source : undefined;
  if (raw.kind === "published") {
    return { kind: "published", label: raw.label, band, source };
  }
  return { kind: "elite", label: raw.label, band, source, sample: parseSample(raw.sample) };
}

function parseMetric(raw: unknown): MeasuredMetric | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.name !== "string" || !raw.name.trim()) return null;
  if (typeof raw.short !== "string" || !raw.short.trim()) return null;
  if (typeof raw.unit !== "string" || !raw.unit.trim()) return null;

  const value = num(raw.value);
  const decimals = num(raw.decimals);
  if (value === null || decimals === null || decimals < 0) return null;

  const direction =
    typeof raw.direction === "string" && DIRECTIONS.has(raw.direction as Direction)
      ? (raw.direction as Direction)
      : null;
  if (!direction) return null;

  const reference = parseReference(raw.reference);
  if (!reference) return null;

  const metric: MeasuredMetric = {
    name: raw.name,
    short: raw.short,
    value,
    unit: raw.unit,
    decimals: Math.min(6, Math.floor(decimals)),
    reference,
    direction,
  };
  if (typeof raw.note === "string" && raw.note.trim()) {
    metric.note = raw.note;
  }
  if (typeof raw.noteShort === "string" && raw.noteShort.trim()) {
    metric.noteShort = raw.noteShort;
  }
  // A percentile without its sample size is not renderable honestly, so both
  // must parse or the row simply shows no rank.
  if (isRecord(raw.percentile)) {
    const rank = num(raw.percentile.value);
    const sample = parseSample(raw.percentile.sample);
    if (rank !== null && sample) {
      metric.percentile = { value: Math.round(rank), sample };
    }
  }
  return metric;
}

function meanConsistency(payload: Record<string, unknown>): number | null {
  const block = section(payload, "consistency");
  const values = CONSISTENCY_FIELDS.flatMap((field) => {
    const cv = num(block[field]);
    if (cv === null) return [];
    return [Math.round(100 * (1 - Math.min(Math.max(cv, 0), 1)))];
  });
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** True when a v2/v1 renderer could show something for this payload. */
function hasFallbackBody(payload: Record<string, unknown>): boolean {
  if (Array.isArray(payload.shots) && payload.shots.length > 0) return true;
  if (isRecord(payload.delivery)) return true;
  if (num(payload.overall_score) !== null) return true;
  return Array.isArray(payload.metrics) && payload.metrics.length > 0;
}

/**
 * Returns the parsed v3 measurements report, or null when the payload has no
 * measurements array (so the caller can fall through to v2 batting/bowling).
 *
 * Also returns null when there is nothing to render as measurements *and* the
 * payload still carries a v2/v1 body. Declining ("not enough of the action was
 * clearly visible") while holding a perfectly good shot breakdown is a lie
 * about the data — the measurements array is an addition to the payload, so
 * its absence must never subtract from what the older renderers can already
 * show. A payload with no fallback body still gets the honest decline copy.
 */
export function parseMeasuredReport(payload: unknown): ParsedMeasuredReport | null {
  if (!isRecord(payload) || !Array.isArray(payload.measurements)) return null;

  const coverage = section(payload, "coverage");
  // Missing scored defaults to true so older staged payloads still render;
  // an explicit false is the honesty gate.
  const scored = coverage.scored === false ? false : true;
  const metrics = scored
    ? payload.measurements.flatMap((raw) => parseMetric(raw) ?? [])
    : [];

  if (metrics.length === 0 && hasFallbackBody(payload)) return null;

  return {
    metrics,
    scored,
    heightCm: num(section(payload, "calibration").height_cm),
    fps: num(section(payload, "video").fps),
    consistency: meanConsistency(payload),
  };
}

export function measuredConsistency(parsed: ParsedMeasuredReport): number | null {
  return parsed.consistency;
}

/** Renders the v3 measurements body inside ReportPanel's card. */
export function MeasuredReport({
  parsed,
  report,
  tone,
}: {
  parsed: ParsedMeasuredReport;
  report: VideoReport;
  tone: Tone;
}) {
  const dark = tone === "dark";
  const metaParts = [
    parsed.heightCm !== null ? `Calibrated to ${Math.round(parsed.heightCm)} cm` : null,
    parsed.fps !== null ? `${Math.round(parsed.fps)} fps` : null,
    report.modelVersion,
  ].filter(Boolean);

  if (!parsed.scored || parsed.metrics.length === 0) {
    return (
      <div className={dark ? "" : "pt-4"}>
        <p className={`pt-4 text-sm ${dark ? "text-sage-400" : "text-ink-600"}`}>
          Not enough of the action was clearly visible to measure honestly — try a
          clearer angle or a longer clip of the shot.
        </p>
        {metaParts.length > 0 && (
          <p className={`mt-3 font-mono text-[10.5px] ${dark ? "text-sage-400" : "text-ink-600"}`}>
            {metaParts.join(" · ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={dark ? "" : "pt-4"}>
      <MeasurementsIntro tone={tone} />
      <div className="mt-1">
        {parsed.metrics.map((metric) => (
          <MeasuredMetricRow key={metric.name} metric={metric} tone={tone} />
        ))}
      </div>
      {metaParts.length > 0 && (
        <p className={`mt-3 font-mono text-[10.5px] ${dark ? "text-sage-400" : "text-ink-600"}`}>
          {metaParts.join(" · ")}
        </p>
      )}
    </div>
  );
}

/** Compact scoreboard stats for LatestReportCard. */
export function measuredCardStats(parsed: ParsedMeasuredReport): {
  headline: string;
  stats: { label: string; value: string }[];
} {
  if (!parsed.scored || parsed.metrics.length === 0) {
    return {
      headline: "Analysis ran — not enough signal to measure honestly.",
      stats: [],
    };
  }

  const consistency = measuredConsistency(parsed);
  return {
    headline: `${parsed.metrics.length} measurement${parsed.metrics.length === 1 ? "" : "s"} ready.`,
    stats: [
      ...(consistency === null ? [] : [{ label: "Consistency", value: `${consistency}%` }]),
      ...parsed.metrics.slice(0, 2).map((metric) => ({
        label: metric.short,
        value: `${metric.value.toFixed(metric.decimals)} ${metric.unit}`,
      })),
    ],
  };
}

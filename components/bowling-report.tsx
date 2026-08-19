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
 * Renderer for the bowling-analysis payload produced by the CRICKET worker
 * (api_bowling.analyze_bowling -> { video, calibration, delivery }). Each
 * bowling video is a single delivery; consistency across deliveries lives on
 * the session page. Everything is parsed defensively — any field may be null.
 * See docs/reports-contract.md (schema_version 3).
 */

type Tone = "light" | "dark";
type BraceLabel = "braced" | "soft/absorbing" | "collapsing";

type Stat = { key: string; label: string; value: string };
type Event = { label: string; timeSec: number };

export type ParsedBowlingReport = {
  brace: {
    label: BraceLabel | null;
    landingAngle: number | null;
    releaseAngle: number | null;
    angleChange: number | null;
  };
  stats: Stat[];
  events: Event[];
  heightCm: number | null;
  fps: number | null;
};

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

function braceLabelOf(value: unknown): BraceLabel | null {
  return value === "braced" || value === "soft/absorbing" || value === "collapsing" ? value : null;
}

function formatCm(value: number | null): string | null {
  return value === null ? null : `${value.toFixed(0)} cm`;
}

/** Run-up / follow-through: distance in metres and duration, whichever exist. */
function phaseValue(phase: Record<string, unknown>): string | null {
  const distanceCm = num(phase.distance_cm);
  const durationSec = num(phase.duration_sec);
  const parts: string[] = [];
  if (distanceCm !== null) parts.push(`${(distanceCm / 100).toFixed(1)} m`);
  if (durationSec !== null) parts.push(`${durationSec.toFixed(2)}s`);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * Returns the parsed bowling report, or null if `payload` isn't the bowling
 * shape (letting the caller fall back to the batting/legacy renderers).
 */
export function parseBowlingReport(payload: unknown): ParsedBowlingReport | null {
  if (!isRecord(payload) || !isRecord(payload.delivery)) return null;
  const delivery = payload.delivery;

  const braceRaw = section(delivery, "front_knee_brace");
  const stride = section(delivery, "stride");
  const release = section(delivery, "release");
  const events = section(delivery, "events");

  const stats: Stat[] = [
    { key: "stride", label: "Delivery stride", value: formatCm(num(stride.length_cm)) },
    { key: "release", label: "Release height", value: formatCm(num(release.height_cm)) },
    { key: "run_up", label: "Run-up", value: phaseValue(section(delivery, "run_up")) },
    {
      key: "follow_through",
      label: "Follow-through",
      value: phaseValue(section(delivery, "follow_through")),
    },
  ].flatMap((stat) => (stat.value ? [{ key: stat.key, label: stat.label, value: stat.value }] : []));

  const timeline: Event[] = [
    { label: "Back-foot landing", timeSec: num(events.back_foot_landing_time_sec) },
    { label: "Front-foot landing", timeSec: num(events.front_foot_landing_time_sec) },
    { label: "Release", timeSec: num(events.release_time_sec) },
  ].flatMap((event) =>
    event.timeSec === null ? [] : [{ label: event.label, timeSec: event.timeSec }],
  );

  return {
    brace: {
      label: braceLabelOf(braceRaw.brace_label),
      landingAngle: num(braceRaw.landing_angle_deg),
      releaseAngle: num(braceRaw.release_angle_deg),
      angleChange: num(braceRaw.angle_change_deg),
    },
    stats,
    events: timeline,
    heightCm: num(section(payload, "calibration").height_cm),
    fps: num(section(payload, "video").fps),
  };
}

function formatTimestamp(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

const BRACE_SCORE: Record<BraceLabel, number> = {
  braced: 90,
  "soft/absorbing": 72,
  collapsing: 58,
};

const BRACE_NOTE: Record<BraceLabel, string> = {
  braced: "Very good. Front leg holds — almost elite.",
  "soft/absorbing": "Okay. The knee gives a little at landing.",
  collapsing: "Needs work. The front knee collapses through the delivery.",
};

function bowlingScore(parsed: ParsedBowlingReport): number {
  if (parsed.brace.label) return BRACE_SCORE[parsed.brace.label];
  return 80;
}

function bowlingScoreTiles(parsed: ParsedBowlingReport): ScoreTile[] {
  const tiles: ScoreTile[] = [];
  if (parsed.brace.label) {
    tiles.push({
      name: "Front-knee brace",
      score: BRACE_SCORE[parsed.brace.label],
      note: BRACE_NOTE[parsed.brace.label],
      delta: visualDelta(BRACE_SCORE[parsed.brace.label]),
    });
  }
  const change = parsed.brace.angleChange;
  if (change !== null) {
    const score = change > 15 ? 64 : change > 8 ? 76 : 88;
    tiles.push({
      name: "Front-foot plant",
      score,
      note:
        score >= 85
          ? "Very good. Plant stays firm through release."
          : score >= 70
            ? "Okay. A little give between landing and release."
            : "Needs work. The plant folds as you come through.",
      delta: visualDelta(score),
    });
  }
  if (parsed.stats.some((stat) => stat.key === "release")) {
    tiles.push({
      name: "Release height",
      score: 84,
      note: "Solid. Release stays up — keep this as the floor.",
      delta: visualDelta(84),
    });
  }
  return tiles.slice(0, 3);
}

function braceColor(label: BraceLabel, dark: boolean) {
  if (label === "braced") return dark ? "text-gold-500" : "text-gold-600";
  if (label === "collapsing") return dark ? "text-rust-500" : "text-rust-600";
  return dark ? "text-sage-400" : "text-ink-600"; // soft/absorbing
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

/** Renders the parsed bowling delivery inside ReportPanel's card. */
export function BowlingReport({
  parsed,
  report,
  tone,
  derived,
}: {
  parsed: ParsedBowlingReport;
  report: VideoReport;
  tone: Tone;
  /** History-derived scoreboard data (lib/report-history.ts); leads when present. */
  derived?: DerivedReport | null;
}) {
  const dark = tone === "dark";
  const rowBorder = dark ? "border-cream-200/15" : "border-cream-400";
  const bodyText = dark ? "text-cream-200" : "text-ink-900";
  const mutedText = dark ? "text-sage-400" : "text-ink-600";

  const measurements = derived?.metrics ?? [];
  const history = derived?.consistencyHistory ?? [];
  const tiles = bowlingScoreTiles(parsed);
  const score = bowlingScore(parsed);
  const focus = derived?.focus ?? deriveFocus(report.payload) ?? FALLBACK_FOCUS;
  // A measurement row supersedes its plain stat line — no number twice.
  const measuredNames = new Set(measurements.map((metric) => metric.name));
  const statRows = parsed.stats.filter((stat) => !measuredNames.has(stat.label));

  const { brace } = parsed;
  const angleLine =
    brace.landingAngle !== null && brace.releaseAngle !== null
      ? `Landing ${brace.landingAngle.toFixed(0)}° → release ${brace.releaseAngle.toFixed(0)}°${
          brace.angleChange !== null
            ? ` (${brace.angleChange > 0 ? "+" : ""}${brace.angleChange.toFixed(0)}°)`
            : ""
        }`
      : null;

  const hasBrace = brace.label !== null || angleLine !== null;
  const hasContent = hasBrace || parsed.stats.length > 0 || parsed.events.length > 0;

  const metaParts = [
    parsed.heightCm !== null ? `Calibrated to ${Math.round(parsed.heightCm)} cm` : null,
    parsed.fps !== null ? `${Math.round(parsed.fps)} fps` : null,
    report.modelVersion,
  ].filter(Boolean);

  return (
    <div className={dark ? "" : "pt-4"}>
      {!hasContent ? (
        <p className={`pt-4 text-sm ${mutedText}`}>
          The analysis ran but couldn&apos;t measure this delivery clearly.
        </p>
      ) : (
        <>
          <ReportHero balls="1 delivery analysed" history={history} score={score} tone={tone} />
          <ScoreTiles tiles={tiles} tone={tone} />
          <SessionsChart history={history} today={score} tone={tone} />
          <FocusBlock focus={focus} nextScore={nextScoreFor(score)} tone={tone} />

          {(measurements.length > 0 ||
            hasBrace ||
            statRows.length > 0 ||
            parsed.events.length > 0) && (
            <details className={`border-b ${rowBorder}`}>
              <summary
                className={`cursor-pointer py-3 font-display text-sm tracking-[.08em] uppercase ${mutedText}`}
              >
                Measurements &amp; delivery detail
              </summary>
              {measurements.length > 0 && (
                <div className="pt-2 pb-1">
                  <DerivedMeasurements metrics={measurements} tone={tone} />
                </div>
              )}
              {hasBrace && (
                <div className={`border-b py-3.5 ${rowBorder}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-sm tracking-[.08em] uppercase">
                      Front-knee brace
                    </span>
                    {brace.label && (
                      <span className={`text-[12.5px] font-medium ${braceColor(brace.label, dark)}`}>
                        {brace.label}
                      </span>
                    )}
                  </div>
                  {angleLine && <p className={`mt-2 font-mono text-[11px] ${mutedText}`}>{angleLine}</p>}
                </div>
              )}

              {statRows.length > 0 && (
                <div className={`grid gap-1 border-b py-3.5 ${rowBorder}`}>
                  {statRows.map((stat) => (
                    <div
                      className="flex items-baseline justify-between gap-3 text-[12.5px]"
                      key={stat.key}
                    >
                      <span className={bodyText}>{stat.label}</span>
                      <span className={`font-mono ${bodyText}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {parsed.events.length > 0 && (
                <div className="flex flex-col gap-[9px] py-4">
                  <Kicker tone={tone}>Key moments</Kicker>
                  {parsed.events.map((event) => (
                    <div className="flex items-baseline gap-2.5" key={event.label}>
                      <span
                        className={`shrink-0 font-mono text-[11px] ${dark ? "text-gold-500" : "text-rust-600"}`}
                      >
                        {formatTimestamp(event.timeSec)}
                      </span>
                      <span className={`text-[12.5px] ${bodyText}`}>{event.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </details>
          )}
          <CoachStamp tone={tone} />
        </>
      )}

      <div className="flex flex-col gap-2 py-4">
        <RawDetails payload={report.payload} tone={tone} />
        {metaParts.length > 0 && (
          <p className={`font-mono text-[10.5px] ${mutedText}`}>{metaParts.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}

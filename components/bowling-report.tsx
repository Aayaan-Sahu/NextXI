import { RawDetails, ReportMeta } from "@/components/report-panel";
import { SeekButton } from "@/components/seek-button";
import { SectionHeading } from "@/components/ui";
import type { VideoReport } from "@/lib/videos.server";

/**
 * Renderer for the bowling-analysis payload produced by the CRICKET worker
 * (api_bowling.analyze_bowling -> { video, calibration, delivery }). Each
 * bowling video is a single delivery; consistency across deliveries lives on
 * the session page. Everything is parsed defensively — any field may be null.
 * See docs/reports-contract.md (schema_version 3).
 */

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

function braceColor(label: BraceLabel) {
  if (label === "braced") return "text-moss-600";
  if (label === "collapsing") return "text-rust-600";
  return "text-ink-600"; // soft/absorbing
}

/** Renders the parsed bowling delivery inside ReportPanel's card. */
export function BowlingReport({
  parsed,
  report,
}: {
  parsed: ParsedBowlingReport;
  report: VideoReport;
}) {
  const { brace } = parsed;
  const angleLine =
    brace.landingAngle !== null && brace.releaseAngle !== null
      ? `Landing ${brace.landingAngle.toFixed(0)}\u00b0 \u2192 release ${brace.releaseAngle.toFixed(0)}\u00b0${
          brace.angleChange !== null
            ? ` (${brace.angleChange > 0 ? "+" : ""}${brace.angleChange.toFixed(0)}\u00b0)`
            : ""
        }`
      : null;

  const hasBrace = brace.label !== null || angleLine !== null;
  const hasContent = hasBrace || parsed.stats.length > 0 || parsed.events.length > 0;

  const metaParts = [
    parsed.heightCm !== null ? `Calibrated to ${Math.round(parsed.heightCm)} cm` : null,
    parsed.fps !== null ? `${Math.round(parsed.fps)} fps` : null,
    report.modelVersion,
  ];

  if (!hasContent) {
    return (
      <>
        <p className="text-body leading-relaxed text-ink-800">
          The analysis ran but couldn&apos;t measure this delivery clearly.
        </p>
        <RawDetails payload={report.payload} />
        <ReportMeta parts={metaParts} />
      </>
    );
  }

  return (
    <>
      {hasBrace && (
        <div>
          <p className="text-caption text-ink-600">Front-knee brace</p>
          {brace.label && (
            <p
              className={`mt-1 font-display text-figure font-semibold tracking-[.02em] uppercase ${braceColor(brace.label)}`}
            >
              {brace.label}
            </p>
          )}
          {angleLine && <p className="mt-1.5 text-ui text-ink-800">{angleLine}</p>}
        </div>
      )}

      {parsed.stats.length > 0 && (
        <div className="mt-5 border-t border-cream-300">
          {parsed.stats.map((stat) => (
            <div
              className="flex justify-between border-b border-cream-300 py-3 text-ui"
              key={stat.key}
            >
              <span className="text-ink-800">{stat.label}</span>
              <span className="font-semibold tabular-nums">{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {parsed.events.length > 0 && (
        <div className="mt-6">
          <SectionHeading as="h3">Key moments</SectionHeading>
          <div className="mt-3 grid gap-2.5 text-ui">
            {parsed.events.map((event) => (
              <div className="flex items-center gap-3" key={event.label}>
                {/* Live when the page has a player: jumps the clip to the event. */}
                <SeekButton className="shrink-0" t={event.timeSec} />
                <span>{event.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <RawDetails payload={report.payload} />
      <ReportMeta parts={metaParts} />
    </>
  );
}

/**
 * The rendering of one measured technique metric — the only one.
 *
 * The data model, the honesty rules about references, and the band/direction
 * helpers live in `measured-metric.tsx`. This module draws them, and it draws
 * them for every surface: the dashboard report, the marketing report card in
 * the pinned hero, and the format-preview page. There used to be a second
 * renderer on the landing page with its own fonts, colours and scale; the two
 * drifted, so now `tone` covers the dark variants and `compact` covers the
 * pinned hero, and there is nothing left to disagree about.
 *
 * Two colours carry the whole readout. Peach is the player's own recent range
 * — the comparison that is always defensible. Tan is an external band, either
 * published literature or a genuinely elite target. The ink rule is the player.
 */

import {
  isOffReference,
  MEASUREMENTS_EXPLAINER,
  referenceBand,
  type MeasuredMetric,
  type Tone,
} from "@/components/measured-metric";
import { Kicker } from "@/components/ui";

/**
 * "1.62 m" but "14°" — a symbol unit binds to the number, a word unit needs the
 * space. The gap is a non-breaking one so a value never wraps away from its
 * unit at a narrow column.
 */
export function formatMeasurement(value: string, unit: string) {
  return /^[a-z]/i.test(unit) ? `${value} ${unit}` : `${value}${unit}`;
}

const REFERENCE_PREFIX = {
  elite: "Elite",
  published: "Benchmark",
  session: "Your range",
  none: null,
} as const;

/** "1st", "2nd", "3rd", "86th" — English ordinals, teens included. */
function ordinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  return `${value}${["th", "st", "nd", "rd"][value % 10] ?? "th"}`;
}

/**
 * Axis extent for the track: covers the value and the band with a margin, so
 * the marker never sits on the edge.
 */
function scaleFor(value: number, band: [number, number]): [number, number] {
  const low = Math.min(value, band[0]);
  const high = Math.max(value, band[1]);
  const pad = high - low > 0 ? (high - low) * 0.45 : Math.abs(high) * 0.1 || 1;
  return [low - pad, high + pad];
}

const position = (value: number, [min, max]: [number, number]) =>
  Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

/** Tone is a palette swap, not a second design: same sizes, same weights, same
    track anatomy. Dark is cream-on-pitch, light is ink-on-cream. */
function palette(dark: boolean) {
  return {
    rule: dark ? "border-cream-200/15" : "border-cream-300",
    name: dark ? "text-cream-100" : "text-ink-900",
    value: dark ? "text-cream-50" : "text-ink-900",
    off: dark ? "text-rust-500" : "text-rust-600",
    muted: dark ? "text-cream-200/70" : "text-ink-600",
    note: dark ? "text-cream-200" : "text-ink-800",
    track: dark ? "bg-cream-200/12" : "bg-cream-250",
    external: dark ? "bg-cream-200/40" : "bg-cream-450",
    marker: dark ? "bg-cream-50" : "bg-ink-900",
  };
}

/**
 * Measurements section chrome: the kicker plus the one line that answers
 * "where is the elite benchmark?" without inventing one. `compact` drops the
 * explainer so the pinned hero card stays inside a short viewport.
 *
 * There is deliberately no key for the track. Every row names its own
 * comparison in words directly underneath it, so a legend at the top is
 * redundant encoding the reader has to look back and forth for.
 */
export function MeasurementsIntro({
  tone = "light",
  compact = false,
}: {
  tone?: Tone;
  compact?: boolean;
}) {
  return (
    <div>
      <Kicker tone={tone}>Measurements</Kicker>
      {!compact && (
        <p className={`mt-1.5 text-caption ${palette(tone === "dark").muted}`}>
          {MEASUREMENTS_EXPLAINER}
        </p>
      )}
    </div>
  );
}

/**
 * One metric row: the name, the measurement, the track, and what it is being
 * compared against. A metric with no defensible reference says so and shows
 * the measurement alone rather than inventing a target.
 *
 * `compact` tightens the row for the pinned hero card, where the report shares
 * the viewport with the video: the one-line read replaces the full note and
 * clamps as a backstop.
 */
export function ReportMetricRow({
  metric,
  tone = "light",
  compact = false,
}: {
  metric: MeasuredMetric;
  tone?: Tone;
  compact?: boolean;
}) {
  const c = palette(tone === "dark");
  const band = referenceBand(metric);
  const off = isOffReference(metric);
  const prefix = REFERENCE_PREFIX[metric.reference.kind];
  const range = band
    ? formatMeasurement(
        band[0] === band[1]
          ? band[0].toFixed(metric.decimals)
          : `${band[0].toFixed(metric.decimals)}–${band[1].toFixed(metric.decimals)}`,
        metric.unit,
      )
    : null;
  // Peach is the player's own history; tan is anything external.
  const bandFill = metric.reference.kind === "session" ? "bg-gold-500" : c.external;

  const scale = band ? scaleFor(metric.value, band) : null;
  const note = compact ? (metric.noteShort ?? metric.note) : metric.note;

  return (
    <div className={`border-t ${c.rule} ${compact ? "py-2.5" : "py-4"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`${compact ? "text-ui" : "text-body"} font-semibold ${c.name}`}>
          {metric.name}
        </span>
        <span
          className={`${compact ? "text-figure-sm" : "text-title"} font-semibold tabular-nums ${
            off ? c.off : c.value
          }`}
        >
          {metric.value.toFixed(metric.decimals)}
          <span
            className={`text-caption font-normal ${c.muted} ${
              /^[a-z]/i.test(metric.unit) ? "ml-1" : ""
            }`}
          >
            {metric.unit}
          </span>
        </span>
      </div>

      {band && scale ? (
        <div
          aria-hidden
          className={`relative rounded-[3px] ${c.track} ${compact ? "mt-2 h-2" : "mt-2.5 h-2.5"}`}
        >
          <span
            className={`absolute inset-y-0 rounded-[3px] ${bandFill}`}
            style={{
              left: `${position(band[0], scale)}%`,
              width: `${position(band[1], scale) - position(band[0], scale)}%`,
            }}
          />
          <span
            className={`absolute -top-1 -bottom-1 w-0.5 ${c.marker}`}
            style={{ left: `${position(metric.value, scale)}%` }}
          />
        </div>
      ) : null}

      <p className={`text-caption leading-relaxed ${c.muted} ${compact ? "mt-1.5" : "mt-2"}`}>
        {prefix ? <span className="font-semibold">{prefix} · </span> : null}
        {range ? (
          <>
            <span className="whitespace-nowrap">{range}</span> · {metric.reference.label}
          </>
        ) : (
          metric.reference.label
        )}
        {metric.percentile ? ` · ${ordinal(metric.percentile.value)} percentile` : null}
      </p>

      {note ? (
        <p
          className={`text-caption leading-relaxed ${c.note} ${
            compact ? "mt-1 line-clamp-2" : "mt-1.5"
          }`}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}

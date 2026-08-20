/**
 * The product rendering of one measured technique metric.
 *
 * The data model, the honesty rules about references, and the band/direction
 * helpers all live in `measured-metric.tsx`, which the landing report variants
 * also draw with. This module is the dashboard's own presentation of that same
 * data: a value, one track showing where it sits, and the comparison named in
 * plain words underneath.
 *
 * Two colours carry the whole readout. Peach is the player's own recent range
 * — the comparison that is always defensible. Tan is an external band, either
 * published literature or a genuinely elite target. The ink rule is the player.
 */

import { isOffReference, referenceBand, type MeasuredMetric } from "@/components/measured-metric";

/**
 * "1.62 m" but "14°" — a symbol unit binds to the number, a word unit needs the
 * space. The gap is a non-breaking one so a value never wraps away from its
 * unit at a narrow column.
 */
export function formatMeasurement(value: string, unit: string) {
  return /^[a-z]/i.test(unit) ? `${value} ${unit}` : `${value}${unit}`;
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

/**
 * One metric row: the name, the measurement, the track, and what it is being
 * compared against. A metric with no defensible reference says so and shows
 * the measurement alone rather than inventing a target.
 */
export function ReportMetricRow({ metric }: { metric: MeasuredMetric }) {
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
  const bandFill = metric.reference.kind === "session" ? "bg-gold-500" : "bg-cream-450";

  const scale = band ? scaleFor(metric.value, band) : null;

  return (
    <div className="border-t border-cream-300 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body font-semibold text-ink-900">{metric.name}</span>
        <span
          className={`text-title font-semibold tabular-nums ${off ? "text-rust-600" : "text-ink-900"}`}
        >
          {metric.value.toFixed(metric.decimals)}
          <span
            className={`text-caption font-normal text-ink-600 ${
              /^[a-z]/i.test(metric.unit) ? "ml-1" : ""
            }`}
          >
            {metric.unit}
          </span>
        </span>
      </div>

      {band && scale ? (
        <div aria-hidden className="relative mt-2.5 h-2.5 rounded-[3px] bg-cream-250">
          <span
            className={`absolute inset-y-0 rounded-[3px] ${bandFill}`}
            style={{
              left: `${position(band[0], scale)}%`,
              width: `${position(band[1], scale) - position(band[0], scale)}%`,
            }}
          />
          <span
            className="absolute -top-1 -bottom-1 w-0.5 bg-ink-900"
            style={{ left: `${position(metric.value, scale)}%` }}
          />
        </div>
      ) : null}

      <p className="mt-2 text-caption leading-relaxed text-ink-600">
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

      {metric.note ? (
        <p className="mt-1.5 text-caption leading-relaxed text-ink-800">{metric.note}</p>
      ) : null}
    </div>
  );
}

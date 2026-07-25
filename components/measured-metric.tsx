/**
 * Shared renderer for a single measured technique metric.
 *
 * The report used to show each metric as an opaque 0-100 score ("Stride 82,
 * elite 85"), which tells a player nothing about which way to correct. This
 * renders the real measurement instead: the value in real units, whatever we
 * can honestly compare it against, and a plain-English read.
 *
 * On references — this is the part that has to stay honest. There is no
 * published "elite benchmark" for most batting kinematics: the accessible
 * literature reports pooled means over mixed international-to-club samples,
 * measured on lab motion-capture rigs, and for stride length it explicitly
 * finds no difference between skilled and less-skilled batters. So a reference
 * is one of three things, and it always says which:
 *
 *   - `session`   the player's own recent range. Always available, always
 *                 defensible, and the most actionable comparison for a junior.
 *   - `published` a real published range, carried with its population so
 *                 nobody reads a provincial group mean as "elite".
 *   - `none`      no defensible comparison exists. We say so and show the
 *                 measurement alone rather than inventing a target.
 *
 * Used by the marketing report variants and by the real product report so the
 * two can never drift apart.
 */

export type Tone = "light" | "dark";

/** Which way is better. `none` means the metric is descriptive, not scored. */
export type Direction = "higher" | "lower" | "inside" | "none";

export type MetricReference =
  /** The elite gold standard — the target that gives a player something to climb
      toward. Only use where the source population genuinely was elite, and name
      that population in `label`. Sitting below an elite band is headroom, not a
      fault: it never renders in the error colour. */
  | { kind: "elite"; label: string; band: [number, number] }
  | { kind: "session"; label: string; band: [number, number] }
  | { kind: "published"; label: string; band: [number, number] }
  | { kind: "none"; label: string };

export type MeasuredMetric = {
  /** Full name, e.g. "Front-foot stride". */
  name: string;
  /** Short axis label for tight layouts, e.g. "Stride". */
  short: string;
  /** The measured value, in `unit`. */
  value: number;
  unit: string;
  /** Decimal places for `value` and the reference band. */
  decimals: number;
  reference: MetricReference;
  direction: Direction;
  /**
   * Plain-English read, carrying the magnitude and the direction where there
   * is one — e.g. "8 cm shorter than your usual; the stride is repeatable".
   * Authored per metric rather than templated, so the coaching stays human.
   */
  note: string;
  /**
   * One-line version of `note` for the pinned hero card, which shares the
   * viewport with the video and cannot afford three wrapped lines per row.
   * Falls back to `note` when absent.
   */
  noteShort?: string;
};

/** The band, when the reference has one. */
export function referenceBand(metric: MeasuredMetric): [number, number] | null {
  return metric.reference.kind === "none" ? null : metric.reference.band;
}

/** Where the value sits relative to the reference band. */
export function bandStatus(metric: MeasuredMetric): "in" | "below" | "above" | "none" {
  const band = referenceBand(metric);
  if (!band) return "none";
  if (metric.value < band[0]) return "below";
  if (metric.value > band[1]) return "above";
  return "in";
}

/**
 * True when the player is on the wrong side of the band *and* the metric has a
 * direction worth flagging. Descriptive metrics never read as a fault.
 */
export function isOffReference(metric: MeasuredMetric): boolean {
  if (metric.direction === "none") return false;
  // An elite band is a target, not a pass mark. Falling short of the best in
  // the world is the normal state for a 15-year-old and must not read as a
  // failure — the gap is the point of showing it.
  if (metric.reference.kind === "elite") return false;
  const status = bandStatus(metric);
  if (status === "in" || status === "none") return false;
  if (metric.direction === "higher") return status === "below";
  if (metric.direction === "lower") return status === "above";
  return true;
}

const fmt = (value: number, decimals: number) => value.toFixed(decimals);

/** The reference band as a range with one unit: "0.94–1.05 m". */
export function bandLabel(metric: MeasuredMetric): string | null {
  const band = referenceBand(metric);
  if (!band) return null;
  const [low, high] = band;
  return low === high
    ? `${fmt(low, metric.decimals)} ${metric.unit}`
    : `${fmt(low, metric.decimals)}–${fmt(high, metric.decimals)} ${metric.unit}`;
}

/**
 * Axis extent for the scale: covers the value and the band with a margin, so
 * the marker never sits on the edge. Derived rather than authored — one less
 * number per metric to get wrong.
 */
function scaleFor(metric: MeasuredMetric, band: [number, number]): [number, number] {
  const low = Math.min(metric.value, band[0]);
  const high = Math.max(metric.value, band[1]);
  const pad = high - low > 0 ? (high - low) * 0.45 : Math.abs(high) * 0.1 || 1;
  return [low - pad, high + pad];
}

const position = (value: number, [min, max]: [number, number]) =>
  Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

/**
 * The scale: an axis, the reference range as a band, the player's value as a
 * marker. Decorative — every number it encodes is also present as text, so
 * screen readers lose nothing.
 */
function Scale({
  metric,
  tone,
  compact,
}: {
  metric: MeasuredMetric;
  tone: Tone;
  compact: boolean;
}) {
  const band = referenceBand(metric);
  if (!band) return null;

  const dark = tone === "dark";
  const off = isOffReference(metric);
  const elite = metric.reference.kind === "elite";
  const scale = scaleFor(metric, band);
  const bandLeft = position(band[0], scale);
  const bandWidth = position(band[1], scale) - bandLeft;
  const marker = position(metric.value, scale);
  // Gold is the brand's achievement colour, mint is the machine's measurement
  // colour. An elite target reads as something to reach, so it takes gold.
  const bandFill = elite
    ? dark ? "bg-gold-500/25" : "bg-gold-500/25"
    : dark ? "bg-vision-500/25" : "bg-vision-700/15";
  const bandEdge = elite
    ? dark ? "bg-gold-500/80" : "bg-gold-600/70"
    : dark ? "bg-vision-500/70" : "bg-vision-700/50";

  return (
    <div className={`relative ${compact ? "mt-1.5 h-2.5" : "mt-2.5 h-3"}`} aria-hidden>
      <span
        className={`absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 ${
          dark ? "bg-cream-200/20" : "bg-cream-400"
        }`}
      />
      <span
        className={`absolute top-1/2 h-[7px] -translate-y-1/2 rounded-[1px] ${bandFill}`}
        style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
      />
      {[bandLeft, bandLeft + bandWidth].map((left, i) => (
        <span
          key={i}
          className={`absolute top-1/2 h-[7px] w-px -translate-y-1/2 ${bandEdge}`}
          style={{ left: `${left}%` }}
        />
      ))}
      <span
        className={`absolute top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rotate-45 ${
          off ? (dark ? "bg-rust-500" : "bg-rust-600") : dark ? "bg-gold-500" : "bg-gold-600"
        }`}
        style={{ left: `${marker}%` }}
      />
    </div>
  );
}

/**
 * One metric row: name, measured value, what it's compared against, the scale,
 * and the read. `compact` tightens it for the pinned hero card, where the
 * report shares the viewport with the video.
 */
export function MeasuredMetricRow({
  metric,
  tone,
  compact = false,
}: {
  metric: MeasuredMetric;
  tone: Tone;
  compact?: boolean;
}) {
  const dark = tone === "dark";
  const off = isOffReference(metric);
  const band = bandLabel(metric);

  return (
    <div
      className={`border-b ${dark ? "border-cream-200/15" : "border-cream-300"} ${
        compact ? "py-2.5" : "py-3.5"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`font-display font-semibold tracking-[.06em] uppercase ${
            compact ? "text-[13px]" : "text-[15px]"
          } ${dark ? "text-cream-100" : "text-ink-900"}`}
        >
          {metric.name}
        </span>
        <span
          className={`font-mono font-semibold tabular-nums ${compact ? "text-[15px]" : "text-xl"} ${
            off ? (dark ? "text-rust-500" : "text-rust-600") : dark ? "text-gold-500" : "text-ink-900"
          }`}
        >
          {fmt(metric.value, metric.decimals)}
          <span
            className={`ml-1 text-[11px] font-medium ${dark ? "text-sage-400" : "text-ink-600"}`}
          >
            {metric.unit}
          </span>
        </span>
      </div>

      <Scale metric={metric} tone={tone} compact={compact} />

      <div
        className={`font-mono tracking-[.08em] ${
          compact ? "mt-0.5 text-[10px]" : "mt-1 text-[10.5px]"
        } ${
          metric.reference.kind === "elite"
            ? dark ? "text-gold-500" : "text-gold-600"
            : dark ? "text-sage-400" : "text-ink-600"
        }`}
      >
        {metric.reference.kind === "elite" && <span className="font-semibold">Elite · </span>}
        {band ? `${metric.reference.label} · ${band}` : metric.reference.label}
      </div>

      {/* In the pinned hero the card shares the viewport with the video, so the
          row uses the one-line read and clamps as a backstop; the standalone
          report always shows the full note. */}
      <p
        className={`${
          compact ? "mt-1 line-clamp-2 text-[11px] leading-[1.45]" : "mt-1.5 text-[12.5px] leading-[1.5]"
        } ${dark ? "text-cream-200" : "text-ink-900"}`}
      >
        {compact ? (metric.noteShort ?? metric.note) : metric.note}
      </p>
    </div>
  );
}

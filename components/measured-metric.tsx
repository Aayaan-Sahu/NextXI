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
 * is one of four things, and it always says which:
 *
 *   - `session`   the player's own recent range. Always available, always
 *                 defensible, and the most actionable comparison for a junior.
 *                 UI prefix: "Your range ·".
 *   - `published` a real published range, carried with its population so
 *                 nobody reads a provincial group mean as "elite".
 *                 UI prefix: "Benchmark ·".
 *   - `elite`     a genuinely elite target (gold). Unused until NextXI's own
 *                 pro reference set exists. UI prefix: "Elite ·".
 *   - `none`      no defensible comparison exists. We say so and show the
 *                 measurement alone rather than inventing a target.
 *
 * `label` carries the population / window in plain language; the full academic
 * citation travels in the optional `source` field, which is never rendered to
 * players — provenance stays machine-traceable without reading as a footnote.
 *
 * Used by the marketing report variants and by the real product report so the
 * two can never drift apart.
 */

import { Kicker } from "@/components/ui";

export type Tone = "light" | "dark";

/** One-line explainer under the Measurements heading — stops readers hunting
    for an elite band on every row. */
export const MEASUREMENTS_EXPLAINER =
  "Compared to your recent sessions, unless labelled Benchmark or Elite.";

/** Which way is better. `none` means the metric is descriptive, not scored. */
export type Direction = "higher" | "lower" | "inside" | "none";

export type MetricReference =
  /** The elite gold standard — the target that gives a player something to climb
      toward. Only use where the source population genuinely was elite, and name
      that population in `label`. Sitting below an elite band is headroom, not a
      fault: it never renders in the error colour. */
  | {
      kind: "elite";
      label: string;
      band: [number, number];
      source?: string;
      /** Size of the reference population, when the producer sends one. */
      sample?: { players: number; shots: number; provisional?: boolean };
    }
  | { kind: "session"; label: string; band: [number, number] }
  | { kind: "published"; label: string; band: [number, number]; source?: string }
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
   * Optional: a producer that has measurements but no defensible sentence to
   * write about them sends none, and the row simply ends at the scale.
   */
  note?: string;
  /**
   * Where the value lands in the reference population: the share of that
   * population's samples below it. Rendered as a plain rank beside the
   * reference, never as a score — `direction` already says which way is
   * better, and the scale already shows the position.
   */
  percentile?: { value: number; sample: { players: number; shots: number } };
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

/** "1st", "2nd", "3rd", "86th" — English ordinals, teens included. */
function ordinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  return `${value}${["th", "st", "nd", "rd"][value % 10] ?? "th"}`;
}

/** The reference band as a range with one unit: "0.94–1.05 m". The unit is
    bound with a no-break space so it can never orphan onto its own line when
    the reference row wraps in a narrow card. */
export function bandLabel(metric: MeasuredMetric): string | null {
  const band = referenceBand(metric);
  if (!band) return null;
  const [low, high] = band;
  return low === high
    ? `${fmt(low, metric.decimals)} ${metric.unit}`
    : `${fmt(low, metric.decimals)}–${fmt(high, metric.decimals)} ${metric.unit}`;
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
  const kind = metric.reference.kind;
  const scale = scaleFor(metric, band);
  const bandLeft = position(band[0], scale);
  const bandWidth = position(band[1], scale) - bandLeft;
  const marker = position(metric.value, scale);
  // Visual kind split so the three comparisons never look identical:
  //   elite     → gold (achievement target)
  //   published → ink/cream (external literature band — a benchmark, not "you")
  //   session   → mint/vision (machine measurement of your own history)
  const bandFill =
    kind === "elite"
      ? "bg-gold-500/25"
      : kind === "published"
        ? dark
          ? "bg-cream-200/20"
          : "bg-ink-900/10"
        : dark
          ? "bg-vision-500/25"
          : "bg-vision-700/15";
  const bandEdge =
    kind === "elite"
      ? dark
        ? "bg-gold-500/80"
        : "bg-gold-600/70"
      : kind === "published"
        ? dark
          ? "bg-cream-200/70"
          : "bg-ink-900/45"
        : dark
          ? "bg-vision-500/70"
          : "bg-vision-700/50";

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
 * Key for the Scale visual, rendered beside a measurements section heading:
 * the player's value is the gold diamond, the comparison range the tinted bar.
 * Decorative like the Scale itself (every encoded number is also row text), so
 * it hides from screen readers.
 */
export function ScaleLegend({
  tone,
  compact = false,
}: {
  tone: Tone;
  compact?: boolean;
}) {
  const dark = tone === "dark";
  return (
    <span
      aria-hidden
      className={`inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-mono text-[10px] tracking-[.08em] ${
        dark ? "text-sage-400" : "text-ink-600"
      }`}
    >
      <span
        className={`size-[7px] self-center rotate-45 ${dark ? "bg-gold-500" : "bg-gold-600"}`}
      />
      you
      <span
        className={`ml-1 h-[7px] w-4 self-center rounded-[1px] ${
          dark ? "bg-vision-500/40" : "bg-vision-700/25"
        }`}
      />
      {compact ? "range" : "your range"}
      {!compact && (
        <>
          <span
            className={`ml-1 h-[7px] w-4 self-center rounded-[1px] ${
              dark ? "bg-cream-200/35" : "bg-ink-900/20"
            }`}
          />
          benchmark
        </>
      )}
    </span>
  );
}

/**
 * Measurements section chrome shared by marketing variants and the product
 * report: kicker + scale legend, plus the explainer that answers "where is the
 * elite benchmark?" without inventing one. `compact` drops the explainer so the
 * pinned hero card stays inside a short viewport.
 */
export function MeasurementsIntro({
  tone,
  compact = false,
}: {
  tone: Tone;
  compact?: boolean;
}) {
  const dark = tone === "dark";
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Kicker tone={tone}>Measurements</Kicker>
        <ScaleLegend tone={tone} compact={compact} />
      </div>
      {!compact && (
        <p
          className={`mt-1.5 font-mono text-[10.5px] leading-snug tracking-[.04em] ${
            dark ? "text-sage-400" : "text-ink-600"
          }`}
        >
          {MEASUREMENTS_EXPLAINER}
        </p>
      )}
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
            compact ? "text-[13px]" : "text-body"
          } ${dark ? "text-cream-100" : "text-ink-900"}`}
        >
          {metric.name}
        </span>
        <span
          className={`font-mono font-semibold tabular-nums ${compact ? "text-body" : "text-xl"} ${
            off ? (dark ? "text-rust-500" : "text-rust-600") : dark ? "text-gold-500" : "text-ink-900"
          }`}
        >
          {fmt(metric.value, metric.decimals)}
          <span
            className={`ml-1 text-micro font-medium ${dark ? "text-sage-400" : "text-ink-600"}`}
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
            ? dark
              ? "text-gold-500"
              : "text-gold-600"
            : dark
              ? "text-sage-400"
              : "text-ink-600"
        }`}
      >
        {/* Kind renders as a bold prefix so labels never author it:
            Your range / Benchmark / Elite stay parallel and scannable.
            Elite is reserved for a genuinely elite source (see MetricReference). */}
        {metric.reference.kind === "elite" && <span className="font-semibold">Elite · </span>}
        {metric.reference.kind === "published" && (
          <span className="font-semibold">Benchmark · </span>
        )}
        {metric.reference.kind === "session" && (
          <span className="font-semibold">Your range · </span>
        )}
        {/* The range never breaks internally — "100–123 °" wraps as one piece
            instead of stranding the unit or half the range on its own line. */}
        {band ? (
          <>
            {metric.reference.label} · <span className="whitespace-nowrap">{band}</span>
          </>
        ) : (
          metric.reference.label
        )}
      </div>

      {/* Where the player lands in the reference population. Deliberately a
          bare rank: `direction` says which way is better and the scale above
          already shows the position, so wording it as good or bad here would
          be inventing a judgement the measurement does not carry. The
          population and its size are already on the reference line above, so
          they are not repeated — but the parser still requires the sample,
          because a percentile whose n is unknown is not renderable honestly. */}
      {metric.percentile && (
        <div
          className={`font-mono tracking-[.08em] ${
            compact ? "mt-0.5 text-[10px]" : "mt-1 text-[10.5px]"
          } ${dark ? "text-sage-400" : "text-ink-600"}`}
        >
          <span className={dark ? "font-semibold text-gold-500" : "font-semibold text-gold-600"}>
            {ordinal(metric.percentile.value)} percentile
          </span>
        </div>
      )}

      {/* In the pinned hero the card shares the viewport with the video, so the
          row uses the one-line read and clamps as a backstop; the standalone
          report always shows the full note. A producer with no note sends
          none, and the row ends here. */}
      {(compact ? (metric.noteShort ?? metric.note) : metric.note) && (
        <p
          className={`${
            compact ? "mt-1 line-clamp-2 text-micro leading-[1.45]" : "mt-1.5 text-caption leading-[1.5]"
          } ${dark ? "text-cream-200" : "text-ink-900"}`}
        >
          {compact ? (metric.noteShort ?? metric.note) : metric.note}
        </p>
      )}
    </div>
  );
}

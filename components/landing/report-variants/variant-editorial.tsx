"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { MeasurementsIntro, ReportMetricRow } from "@/components/report-metric";
import { Kicker } from "@/components/ui";
import {
  CONSISTENCY,
  DRILL,
  METRICS,
  SHOTS_ANALYSED,
  SUBTITLE,
  SUMMARY,
  SUMMARY_SHORT,
  WEAKEST_SHORT,
} from "./report-data";
import { ReportTrailer } from "./report-shared";

/** Reveals its children as `progress` passes [from,to]; static if no progress.
    Keyframes span the full [0,1] input and hold at the end so a revealed block
    never drifts back out over the pin's tail (ScrollTimeline fills open ends). */
function Reveal({
  progress,
  from,
  to,
  className,
  children,
}: {
  progress?: MotionValue<number>;
  from: number;
  to: number;
  className?: string;
  children: React.ReactNode;
}) {
  return progress ? (
    <RevealBox progress={progress} from={from} to={to} className={className}>
      {children}
    </RevealBox>
  ) : (
    <div className={className}>{children}</div>
  );
}

function RevealBox({
  progress,
  from,
  to,
  className,
  children,
}: {
  progress: MotionValue<number>;
  from: number;
  to: number;
  className?: string;
  children: React.ReactNode;
}) {
  const opacity = useTransform(progress, [0, from, to, 1], [0, 0, 1, 1]);
  const y = useTransform(progress, [0, from, to, 1], [14, 14, 0, 0]);
  return (
    <motion.div style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}

/** Variant C — the printed report, and the one that ships: a `cream-50` panel
    with the product's own measurement rows, so the card in the marketing hero
    is the same object the dashboard renders. When a `progress` MotionValue is
    passed (the pinned hero split) it reveals line by line and runs the compact
    layout that fits a pinned viewport; without it (the standalone
    /report-preview) it renders the full static card. */
export function VariantEditorial({ progress }: { progress?: MotionValue<number> } = {}) {
  const compact = !!progress;
  // 8 reveal blocks (header, summary, metrics kicker, 3 rows, focus, coach)
  // packed into [0.62, ~0.97] — every from/to must stay inside [0,1] or
  // Motion's ScrollTimeline throws ("offsets must be in range [0,1]").
  const S = 0.62;
  const step = 0.043;
  const dur = 0.05;
  const w = (i: number) => ({ from: S + i * step, to: S + i * step + dur });
  // A measured row (value, scale, reference, read) is roughly twice the height
  // of the score tile it replaced, so the pinned split shows three metrics —
  // four overflowed the pinned viewport top and bottom on a 722px window. The
  // standalone preview keeps all five.
  const metrics = compact ? METRICS.slice(0, 3) : METRICS;

  return (
    // Shadow only in the pinned hero, where the card genuinely floats over the
    // footage. On /report-preview it is a resting card, and a resting card
    // never has one.
    <div
      className={`rounded-[10px] border border-cream-400 bg-cream-50 px-6 text-ink-900 sm:px-7 ${
        compact ? "pt-5 pb-3 shadow-float" : "pt-6 pb-4"
      }`}
    >
      <Reveal
        progress={progress}
        {...w(0)}
        className={`flex items-end justify-between gap-4 border-b border-cream-400 ${compact ? "pb-3" : "pb-4"}`}
      >
        <div className="min-w-0">
          <Kicker>Coaching report</Kicker>
          <div className="mt-2 text-caption text-ink-600">{SUBTITLE}</div>
        </div>
        {/* shrink-0 + nowrap: the figure's caption is a single fact and must
            never break across two lines beside a 28px number. */}
        <div className="shrink-0 text-right">
          <div className="text-figure font-semibold tabular-nums text-ink-900">
            {CONSISTENCY}
            <span className="text-figure-sm">%</span>
          </div>
          <div className="mt-1 whitespace-nowrap text-caption text-ink-600">
            Consistency · {SHOTS_ANALYSED} balls
          </div>
        </div>
      </Reveal>

      <Reveal
        progress={progress}
        {...w(1)}
        className={`border-b border-cream-400 text-body text-ink-800 ${
          compact ? "py-2.5" : "py-3.5"
        }`}
      >
        {compact ? SUMMARY_SHORT : SUMMARY}
      </Reveal>

      <div className={compact ? "pt-3" : "pt-4"}>
        <Reveal progress={progress} {...w(2)}>
          <MeasurementsIntro compact={compact} />
        </Reveal>
        <div className="mt-2">
          {metrics.map((metric, i) => (
            <Reveal
              key={metric.name}
              progress={progress}
              {...w(3 + i)}
              // The pinned card is a fixed height inside a h-dvh pin, so on a
              // short desktop viewport (~1280×800 laptops land near 700px of
              // usable height) the third row would push the header and the
              // coach sign-off off screen. Drop it below that threshold rather
              // than letting the card overflow.
              className={compact && i === 2 ? "[@media(max-height:760px)]:hidden" : undefined}
            >
              <ReportMetricRow metric={metric} compact={compact} />
            </Reveal>
          ))}
        </div>
      </div>

      {compact ? (
        <>
          <Reveal progress={progress} {...w(6)} className="pt-4">
            <Kicker>Focus area</Kicker>
            <p className="mt-2 text-ui text-ink-800">{WEAKEST_SHORT}</p>
            {/* The info flash: a left rule and a tinted ground, per Notice. */}
            <div className="mt-2.5 border-l-2 border-amber-500 bg-cream-250 px-3 py-2">
              <div className="text-caption font-semibold text-ink-900">Recommended drill</div>
              <p className="mt-1 text-caption text-ink-800">{DRILL}</p>
            </div>
          </Reveal>
          <Reveal progress={progress} {...w(7)} className="flex items-start gap-2.5 pt-4 pb-1">
            <span className="mt-px text-ui text-moss-600" aria-hidden>
              ✓
            </span>
            <div className="text-ui font-semibold text-ink-900">
              Reviewed &amp; signed off · ECB Level 3 coach
            </div>
          </Reveal>
        </>
      ) : (
        <ReportTrailer tone="light" />
      )}
    </div>
  );
}

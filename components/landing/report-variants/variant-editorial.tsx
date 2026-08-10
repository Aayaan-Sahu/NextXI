"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { MeasuredMetricRow, ScaleLegend } from "@/components/measured-metric";
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

/** Variant C — light "printed report" with measured metric rows. When a
    `progress` MotionValue is passed (the pinned hero split), it reveals line by
    line and runs a compact layout that fits a pinned viewport; without it (the
    standalone /report-preview) it renders the full static card. */
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
    <div
      className={`rounded-[12px] border border-cream-400 bg-white px-6 text-ink-900 shadow-2xl shadow-black/30 sm:px-7 ${
        compact ? "pt-5 pb-3" : "pt-6 pb-4"
      }`}
    >
      <Reveal
        progress={progress}
        {...w(0)}
        className={`flex items-end justify-between gap-4 border-b border-cream-300 ${compact ? "pb-3" : "pb-4"}`}
      >
        <div>
          <Kicker>Coaching report</Kicker>
          <div className="mt-2 font-mono text-[11px] text-ink-600">{SUBTITLE}</div>
        </div>
        <div className="text-right">
          {/* Same size as ReportPanel's light tone (text-4xl); the dark
              variants and the product's dark tone both use the 44px scoreboard
              figure. Marketing must not drift from the real component. */}
          <div className="font-mono text-4xl leading-none font-semibold text-ink-900">
            {CONSISTENCY}
            <span className="text-2xl">%</span>
          </div>
          <div className="mt-0.5 font-display text-[10px] tracking-[.18em] text-ink-600 uppercase">
            Consistency · {SHOTS_ANALYSED} balls
          </div>
        </div>
      </Reveal>

      <Reveal
        progress={progress}
        {...w(1)}
        className={`border-b border-cream-300 text-[13px] leading-[1.5] text-ink-900 ${
          compact ? "py-2.5" : "py-3.5"
        }`}
      >
        {compact ? SUMMARY_SHORT : SUMMARY}
      </Reveal>

      <div className={compact ? "pt-2.5" : "pt-3.5"}>
        <Reveal
          progress={progress}
          {...w(2)}
          className="flex items-center justify-between gap-3"
        >
          <Kicker>Measurements</Kicker>
          <ScaleLegend tone="light" />
        </Reveal>
        <div className="mt-1">
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
              <MeasuredMetricRow metric={metric} tone="light" compact={compact} />
            </Reveal>
          ))}
        </div>
      </div>

      {compact ? (
        <>
          <Reveal progress={progress} {...w(6)} className="pt-3">
            <Kicker>Focus area</Kicker>
            <p className="mt-2 text-[12.5px] leading-[1.5] text-ink-900">{WEAKEST_SHORT}</p>
            <div className="mt-2 rounded-md border border-gold-500/40 bg-gold-500/12 px-3 py-2">
              <div className="font-mono text-[10px] font-semibold tracking-[.2em] text-gold-600 uppercase">
                Recommended drill
              </div>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-900">{DRILL}</p>
            </div>
          </Reveal>
          <Reveal progress={progress} {...w(7)} className="flex items-start gap-3 pt-3.5 pb-1">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-vision-700/15 text-sm text-vision-700">
              ✓
            </span>
            <div className="font-display text-[12.5px] font-semibold tracking-[.06em] text-ink-900 uppercase">
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

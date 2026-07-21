"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { Kicker } from "@/components/ui";
import {
  DRILL,
  MEASUREMENTS,
  METRICS,
  OVERALL,
  SUBTITLE,
  SUMMARY,
  WEAKEST,
  type Metric,
} from "./report-data";
import { DeltaChip, ReportTrailer } from "./report-shared";

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

function StatTile({ metric, compact }: { metric: Metric; compact?: boolean }) {
  const low = metric.score < 80;
  return (
    <div className={`rounded-lg border border-cream-400 bg-cream-50 ${compact ? "p-2.5" : "p-3.5"}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-[11.5px] leading-tight tracking-[.06em] text-ink-900 uppercase">
          {metric.name}
        </span>
        <DeltaChip delta={metric.delta} tone="light" />
      </div>
      <div className={compact ? "mt-0.5 flex items-baseline gap-1" : "mt-1 flex items-baseline gap-1"}>
        <span
          className={`font-mono font-semibold ${compact ? "text-xl" : "text-3xl"} ${
            low ? "text-rust-600" : "text-ink-900"
          }`}
        >
          {metric.score}
        </span>
        <span className="font-mono text-[11px] text-ink-600">/100</span>
      </div>
      <div className={`relative rounded-sm bg-cream-300 ${compact ? "mt-1.5 h-1" : "mt-2 h-1.5"}`}>
        <div
          className={`h-full rounded-sm ${low ? "bg-rust-500" : "bg-gold-500"}`}
          style={{ width: `${metric.score}%` }}
        />
        <span
          className="absolute top-[-2px] h-[10px] w-px bg-ink-900"
          style={{ left: `${metric.elite}%` }}
          title={`Elite benchmark ${metric.elite}`}
        />
      </div>
      <div className="mt-1 font-mono text-[10px] tracking-[.08em] text-ink-600">elite {metric.elite}</div>
    </div>
  );
}

/** Variant C — light "printed report" with metric stat tiles. When a `progress`
    MotionValue is passed (the pinned hero split), it reveals line by line and
    runs a compact layout that fits a pinned viewport; without it (the standalone
    /report-preview) it renders the full static card. */
export function VariantEditorial({ progress }: { progress?: MotionValue<number> } = {}) {
  const compact = !!progress;
  // 10 reveal blocks (header, summary, metrics kicker, 5 tiles, focus, coach)
  // packed into [0.62, ~0.97] — every from/to must stay inside [0,1] or
  // Motion's ScrollTimeline throws ("offsets must be in range [0,1]").
  const S = 0.62;
  const step = 0.036;
  const dur = 0.05;
  const w = (i: number) => ({ from: S + i * step, to: S + i * step + dur });
  // The pinned split shows a tight 2×2 of the four headline metrics so the card
  // stays well clear of the viewport's top/bottom edges; the full standalone
  // preview keeps all five.
  const metrics = compact ? METRICS.slice(0, 4) : METRICS;

  return (
    <div className="rounded-[12px] border border-cream-400 bg-white px-6 pt-6 pb-4 text-ink-900 shadow-2xl shadow-black/30 sm:px-7">
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
          <div className="font-mono text-[40px] leading-none font-semibold text-ink-900">{OVERALL}</div>
          <div className="mt-0.5 font-display text-[11px] tracking-[.22em] text-ink-600 uppercase">
            / 100 overall
          </div>
        </div>
      </Reveal>

      <Reveal
        progress={progress}
        {...w(1)}
        className={`border-b border-cream-300 text-[13px] leading-[1.5] text-ink-900 ${compact ? "py-2.5" : "py-3.5"}`}
      >
        {SUMMARY}
      </Reveal>

      <div className={compact ? "py-2.5" : "py-3.5"}>
        <Reveal progress={progress} {...w(2)}>
          <Kicker>Metrics vs elite benchmark</Kicker>
        </Reveal>
        <div className={`mt-2.5 grid grid-cols-2 ${compact ? "gap-2" : "gap-2.5"}`}>
          {metrics.map((metric, i) => (
            <Reveal key={metric.name} progress={progress} {...w(3 + i)}>
              <StatTile metric={metric} compact={compact} />
            </Reveal>
          ))}
        </div>
      </div>

      {!compact && (
        <div className="flex justify-between gap-2 border-y border-cream-300 py-3.5">
          {MEASUREMENTS.map((m) => (
            <div key={m.label} className="text-center">
              <div className="font-mono text-[15px] font-semibold text-ink-900 tabular-nums">{m.value}</div>
              <div className="mt-1 text-[9.5px] tracking-[.14em] text-ink-600 uppercase">{m.label}</div>
              <div className="font-mono text-[9.5px] text-ink-600/70">elite {m.elite}</div>
            </div>
          ))}
        </div>
      )}

      {compact ? (
        <>
          <Reveal progress={progress} {...w(7)} className="border-t border-cream-300 pt-3">
            <Kicker>Focus area</Kicker>
            <p className="mt-2 text-[12.5px] leading-[1.5] text-ink-900">{WEAKEST}</p>
            <div className="mt-2 rounded-md border border-gold-500/40 bg-gold-500/12 px-3 py-2">
              <div className="font-mono text-[10px] font-semibold tracking-[.2em] text-gold-600 uppercase">
                Recommended drill
              </div>
              <p className="mt-1 text-[12px] leading-snug text-ink-900">{DRILL}</p>
            </div>
          </Reveal>
          <Reveal progress={progress} {...w(8)} className="flex items-start gap-3 pt-3.5 pb-1">
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

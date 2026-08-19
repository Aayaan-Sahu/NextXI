"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { MeasuredMetricRow, MeasurementsIntro } from "@/components/measured-metric";
import {
  CoachStamp,
  FocusBlock,
  ReportHero,
  ScoreTiles,
  SessionsChart,
  nextScoreFor,
  type ScoreTile,
} from "@/components/report-scoreboard";
import { DRILL, METRICS, SHOTS_ANALYSED, WEAKEST, WEAKEST_SHORT } from "./report-data";

const DEMO_HISTORY = [
  { date: new Date(Date.now() - 42 * 86_400_000), value: 68 },
  { date: new Date(Date.now() - 35 * 86_400_000), value: 71 },
  { date: new Date(Date.now() - 21 * 86_400_000), value: 74 },
  { date: new Date(Date.now() - 14 * 86_400_000), value: 79 },
  { date: new Date(Date.now() - 7 * 86_400_000), value: 76 },
];

const DEMO_TILES: ScoreTile[] = [
  {
    name: "Front elbow",
    score: 91,
    note: "Very good. Elbow stays high — almost elite.",
    delta: { text: "▲ 4", dir: "up" },
  },
  {
    name: "Bat swing",
    score: 64,
    note: "Needs work. Bat comes down at an off-angle as you tire.",
    delta: { text: "▼ 3", dir: "down" },
  },
  {
    name: "Head movement",
    score: 88,
    note: "Very good. Head stays still through contact.",
    delta: { text: "▲ 2", dir: "up" },
  },
];

const FOCUS = {
  title: "Your bat swing",
  drill: DRILL,
  remeasure: "swing path",
};

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

/**
 * Product scoreboard. Dark full card on /report-preview; light compact card
 * (hero + three bars + one fix) in the homepage pin, same chrome as live reports.
 */
export function VariantScoreboard({
  progress,
  tone = "dark",
  compact: compactProp,
}: {
  progress?: MotionValue<number>;
  tone?: "light" | "dark";
  /** Homepage pin/mobile: hero + scores + one fix. Preview keeps the full card. */
  compact?: boolean;
} = {}) {
  const compact = compactProp ?? !!progress;
  const dark = tone === "dark";
  const S = 0.62;
  const step = 0.07;
  const dur = 0.05;
  const w = (i: number) => ({ from: S + i * step, to: S + i * step + dur });

  return (
    <div
      className={
        dark
          ? `rounded-[12px] bg-pitch-800 bg-[repeating-linear-gradient(0deg,transparent_0_44px,rgba(0,0,0,.10)_44px_46px)] px-6 text-cream-200 shadow-2xl shadow-black/45 sm:px-7 ${
              compact ? "pt-5 pb-3" : "pt-6 pb-4"
            }`
          : `rounded-[12px] border border-cream-400 bg-white px-6 text-ink-900 shadow-2xl shadow-black/30 sm:px-7 ${
              compact ? "pt-5 pb-3" : "pt-6 pb-4"
            }`
      }
    >
      <Reveal progress={progress} {...w(0)}>
        <ReportHero
          balls={`${SHOTS_ANALYSED} balls analysed`}
          compact={compact}
          history={DEMO_HISTORY}
          score={82}
          tone={tone}
        />
      </Reveal>
      <Reveal progress={progress} {...w(1)}>
        <ScoreTiles compact={compact} tiles={DEMO_TILES} tone={tone} />
      </Reveal>
      {!compact && (
        <>
          <div className="pt-4">
            <MeasurementsIntro tone={tone} withPrevious withBenchmark={false} />
            {METRICS.slice(0, 3).map((metric, index) => (
              <MeasuredMetricRow
                key={metric.name}
                metric={{
                  ...metric,
                  lead: index === 1 ? "Needs work." : "Solid.",
                  previous:
                    metric.reference.kind === "session"
                      ? { value: metric.reference.band[0], label: "Last session" }
                      : { value: metric.value * 0.94, label: "Last session" },
                  deltaPill:
                    index === 1
                      ? { text: "▼ 0.3 cm", dir: "down" }
                      : { text: "▲ 4", dir: "up" },
                }}
                tone={tone}
              />
            ))}
          </div>
          <SessionsChart history={DEMO_HISTORY} today={82} tone={tone} />
        </>
      )}
      <Reveal progress={progress} {...w(2)}>
        <FocusBlock
          compact={compact}
          focus={{
            ...FOCUS,
            detail: compact ? WEAKEST_SHORT : WEAKEST,
          }}
          nextScore={nextScoreFor(82)}
          tone={tone}
        />
      </Reveal>
      <Reveal progress={progress} {...w(3)}>
        <CoachStamp compact={compact} tone={tone} />
      </Reveal>
    </div>
  );
}

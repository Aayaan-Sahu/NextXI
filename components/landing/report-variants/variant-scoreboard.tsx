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
    note: "Needs work. Bat comes down 4.1 cm off straight, costing you the most.",
    delta: { text: "▼ 3", dir: "down" },
  },
  {
    name: "Head movement",
    score: 88,
    note: "Big improvement. Head 3 cm steadier than usual.",
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
 * Coaching report in the published simple-mock register: white card, dark
 * stacked hero, fat green/red bars, last-6 trail, peach fix, coach stamp.
 * Compact (homepage pin / mobile) is that card at readable scale — not a
 * floodlit split graphic. The pin drops the last-6 trail so dial + bars +
 * peach can render larger in the viewport; mobile compact keeps the trail.
 * Full (preview) also keeps measurement diamonds from the second mock.
 */
export function VariantScoreboard({
  progress,
  tone = "light",
  compact: compactProp,
}: {
  progress?: MotionValue<number>;
  tone?: "light" | "dark";
  /** Homepage pin/mobile: mock card without the diamond rows. */
  compact?: boolean;
} = {}) {
  const compact = compactProp ?? !!progress;
  const pin = !!progress;
  const dark = tone === "dark";
  // Pin reveals LEAD hero-scrub's stepped print edge (tiles unveil 0.72,
  // focus 0.78, stamp 0.84): each section is painted before its step exposes
  // it, so a step never shows empty white card. All finish well before the
  // unpin so no line pops in on a frozen card.
  const S = pin ? 0.57 : 0.62;
  const step = pin ? 0.07 : 0.07;
  const dur = pin ? 0.04 : 0.05;
  const w = (i: number) => ({ from: S + i * step, to: S + i * step + dur });
  const focusI = pin ? 2 : 3;
  const stampI = pin ? 3 : 4;

  return (
    <div
      className={
        dark
          ? "overflow-hidden rounded-[12px] bg-pitch-800 text-cream-200 ring-1 ring-inset ring-cream-200/12"
          : "overflow-hidden rounded-[12px] border border-cream-400 bg-white text-ink-900 shadow-2xl shadow-black/30"
      }
    >
      <Reveal progress={progress} {...w(0)}>
        <ReportHero
          balls={
            compact
              ? "Aryaman · Front-foot drive · 12 balls"
              : `${SHOTS_ANALYSED} balls analysed`
          }
          compact={compact}
          // Dial draws + score ticks up across the hero's landing beat.
          countWindow={pin ? [S, S + 0.1] : undefined}
          flush
          history={DEMO_HISTORY}
          progress={progress}
          score={82}
          tone={tone}
        />
      </Reveal>
      <div className={compact ? "px-5 pb-4" : "px-6 pb-4 sm:px-7"}>
        <Reveal progress={progress} {...w(1)}>
          <ScoreTiles
            compact={compact}
            // Bars fill as the tiles step unveils them (0.72 → 0.75), not
            // during the earlier section fade — so each fill happens in view.
            fillWindow={pin ? [0.725, 0.775] : undefined}
            progress={progress}
            tiles={DEMO_TILES}
            tone={tone}
          />
        </Reveal>
        {!compact && (
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
        )}
        {!pin && (
          <Reveal progress={progress} {...w(2)}>
            <SessionsChart compact={compact} history={DEMO_HISTORY} today={82} tone={tone} />
          </Reveal>
        )}
        <Reveal progress={progress} {...w(focusI)}>
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
        <Reveal progress={progress} {...w(stampI)}>
          <CoachStamp compact={compact} tone={tone} />
        </Reveal>
      </div>
    </div>
  );
}

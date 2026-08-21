"use client";

import { motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { Kicker } from "@/components/ui";
import { DRILL, SUBTITLE, WEAKEST, WEAKEST_SHORT } from "./report-data";

/**
 * Variant A — "Scoreboard": the session as a number. A 0–100 dial and verdict,
 * three fat green/red score bars against the elite mark, one fix, a coach
 * stamp — set in the same printed-report register as the editorial card
 * (cream panel, rust kickers, hairline rules, one info flash) so the scores
 * read as a page of the product, not a second design.
 *
 * Marketing card only — product reports render measurement rows
 * (components/report-metric). Moss is the system's one green (a positive
 * verdict in a report), rust the negative, amber the data emphasis on the dial.
 *
 * With a `progress` MotionValue (the pinned hero split) it reveals block by
 * block on the editorial card's schedule, the dial draws and the bars fill as
 * their block lands. Without one (/report-preview) it renders the full card,
 * settled and static.
 */

type ScoreTile = {
  name: string;
  score: number;
  note: string;
  delta: { text: string; dir: "up" | "down" | "same" };
};

const SCORE = 82;
const LAST_SESSION = 76;
/** The elite mark on every bar — a target, always on. */
const ELITE_LEVEL = 95;

const TILES: ScoreTile[] = [
  {
    name: "Front elbow",
    score: 91,
    note: "Very good. Elbow stays high — almost elite.",
    delta: { text: "4", dir: "up" },
  },
  {
    name: "Bat swing",
    score: 64,
    note: "Needs work. Bat comes down 4.1 cm off straight — costs you most.",
    delta: { text: "3", dir: "down" },
  },
  {
    name: "Head movement",
    score: 88,
    note: "Big improvement. Head 3 cm steadier than usual.",
    delta: { text: "2", dir: "up" },
  },
];

const HISTORY = [68, 71, 74, 79, LAST_SESSION, SCORE];

function verdictFor(score: number) {
  if (score >= 85) return "Great session";
  if (score >= 70) return "Good session";
  if (score >= 60) return "Solid session";
  return "Keep building";
}

const good = (score: number) => score >= 70;

/** 0→1 ramp over `window` of a scroll progress; a settled constant 1 without one. */
function useRevealRamp(progress?: MotionValue<number>, window?: [number, number]) {
  const settled = useMotionValue(1);
  const [from, to] = window ?? [0, 1];
  // Keyframes span the full [0,1] input and hold at the end — an open-ended
  // scroll range gets an implicit ScrollTimeline keyframe that drifts the
  // value back over the pin's tail.
  return useTransform(progress ?? settled, [0, from, to, 1], [0, 0, 1, 1]);
}

/** Reveals its children as `progress` passes [from,to]; static if no progress. */
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

function Dial({
  value,
  progress,
  window,
}: {
  value: number;
  progress?: MotionValue<number>;
  window?: [number, number];
}) {
  const circumference = 2 * Math.PI * 44;
  const filled = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  const ramp = useRevealRamp(progress, window);
  const dash = useTransform(ramp, (k) => `${filled * k} ${circumference}`);
  const count = useTransform(ramp, (k) => Math.round(value * k));
  return (
    <div className="relative size-28 shrink-0">
      <svg aria-hidden className="size-full -rotate-90" viewBox="0 0 100 100">
        <circle className="stroke-cream-300" cx="50" cy="50" fill="none" r="44" strokeWidth="8" />
        <motion.circle
          className="stroke-amber-500"
          cx="50"
          cy="50"
          fill="none"
          r="44"
          strokeLinecap="round"
          strokeWidth="8"
          style={{ strokeDasharray: dash }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* The one oversized figure on the card — the session's number, at
            the size the dashboard gives the guardian code. */}
        <motion.span className="font-display text-[44px] leading-none font-bold tracking-[.02em] text-ink-900 tabular-nums">
          {count}
        </motion.span>
        <span className="mt-0.5 text-caption font-semibold tracking-[.12em] text-ink-600 uppercase">
          of 100
        </span>
      </div>
    </div>
  );
}

function ChangePill({ now, previous }: { now: number; previous: number }) {
  const delta = now - previous;
  const base = "inline-block rounded-full px-3 py-1 text-ui font-semibold";
  if (Math.abs(delta) < 2) {
    return <span className={`${base} bg-cream-250 text-ink-600`}>About the same as last time</span>;
  }
  if (delta > 0) {
    return <span className={`${base} bg-moss-600 text-cream-50`}>▲ {delta} on last session</span>;
  }
  return <span className={`${base} bg-rust-600 text-cream-50`}>▼ {-delta} on last session</span>;
}

function DeltaMark({ delta }: { delta: ScoreTile["delta"] }) {
  if (delta.dir === "same") {
    return <span className="text-caption font-semibold text-ink-600">{delta.text}</span>;
  }
  const down = delta.dir === "down";
  const color = down ? "text-rust-600" : "text-moss-600";
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`inline-flex size-[18px] items-center justify-center rounded-[4px] text-micro leading-none ${
          down ? "bg-rust-600/12" : "bg-moss-600/12"
        } ${color}`}
      >
        {down ? "▼" : "▲"}
      </span>
      <span className={`text-caption font-semibold ${color}`}>{delta.text}</span>
    </span>
  );
}

function TileNote({ note }: { note: string }) {
  const dot = note.indexOf(". ");
  if (dot === -1) return <>{note}</>;
  return (
    <>
      <span className="font-semibold text-ink-900">{note.slice(0, dot + 1)}</span>
      {note.slice(dot + 1)}
    </>
  );
}

/** One score row; its bar fills across `window` when scroll-driven. */
function TileRow({
  tile,
  compact,
  progress,
  window,
}: {
  tile: ScoreTile;
  compact: boolean;
  progress?: MotionValue<number>;
  window?: [number, number];
}) {
  const ramp = useRevealRamp(progress, window);
  const target = Math.max(8, Math.min(100, tile.score));
  const width = useTransform(ramp, (k) => `${target * k}%`);
  const ok = good(tile.score);
  return (
    <div className={`border-b border-cream-400 ${compact ? "py-2.5" : "py-3.5"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body font-semibold text-ink-900">{tile.name}</span>
        <span className="flex items-baseline gap-2.5">
          <DeltaMark delta={tile.delta} />
          <span className={`font-semibold tabular-nums ${compact ? "text-figure" : "text-figure-sm"} ${ok ? "text-moss-600" : "text-rust-600"}`}>
            {tile.score}
          </span>
        </span>
      </div>
      <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-cream-300" aria-hidden>
        <motion.div className={`h-full rounded-full ${ok ? "bg-moss-600" : "bg-rust-600"}`} style={{ width }} />
        <div className="absolute inset-y-0 w-px bg-ink-900/45" style={{ left: `${ELITE_LEVEL}%` }} />
      </div>
      <p className={`mt-1.5 text-ink-800 ${compact ? "text-ui" : "text-caption"}`}>
        <TileNote note={tile.note} />
      </p>
    </div>
  );
}

/** Always six columns; the standalone card only. */
function SessionsChart() {
  return (
    <div className="border-b border-cream-400 py-4">
      <Kicker>Last 6 sessions</Kicker>
      <div className="mt-3 flex items-end gap-1.5" aria-hidden>
        {HISTORY.map((value, index) => {
          const today = index === HISTORY.length - 1;
          return (
            <div className="flex-1" key={index}>
              <div
                className={`text-center text-caption font-semibold tabular-nums ${
                  today ? "text-amber-500" : "text-ink-600"
                }`}
              >
                {value}
              </div>
              <div
                className={`mt-1 rounded-t-[3px] ${today ? "bg-amber-500" : "bg-cream-300"}`}
                style={{ height: `${Math.max(6, (value / 100) * 56)}px` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-caption text-ink-600">
        <span>6 weeks ago</span>
        <span className="text-amber-500">today</span>
      </div>
    </div>
  );
}

export function VariantScoreboard({ progress }: { progress?: MotionValue<number> } = {}) {
  const compact = !!progress;
  // Nine reveal beats of similar height — masthead, dial, scores kicker, three
  // rows, the fix, its drill, the stamp — on the editorial card's cadence, the
  // last landing just before the unpin. Every from/to must stay inside [0,1]
  // or Motion's ScrollTimeline throws ("offsets must be in range [0,1]").
  const S = 0.62;
  const step = 0.04;
  const dur = 0.05;
  const w = (i: number) => ({ from: S + i * step, to: S + i * step + dur });

  return (
    // Shadow only in the pinned hero, where the card genuinely floats over the
    // footage. On /report-preview it is a resting card, and a resting card
    // never has one.
    <div
      className={`rounded-[10px] border border-cream-400 bg-cream-50 px-6 text-ink-900 sm:px-7 ${
        compact ? "pt-5 pb-2.5 shadow-float" : "pt-6 pb-4"
      }`}
    >
      {/* The same masthead as the editorial card, then the session's number
          and verdict side by side. */}
      <Reveal progress={progress} {...w(0)}>
        <Kicker>Coaching report</Kicker>
        <div className="mt-2 text-ui text-ink-600">{SUBTITLE}</div>
      </Reveal>
      <Reveal
        progress={progress}
        {...w(1)}
        className={`flex items-center gap-5 border-b border-cream-400 ${compact ? "mt-3.5 pb-3.5" : "mt-5 pb-5"}`}
      >
        <Dial progress={progress} value={SCORE} window={progress ? [w(1).from, w(1).from + 0.1] : undefined} />
        <div className="min-w-0">
          <div className="font-display text-display font-bold tracking-[.04em] text-ink-900 uppercase">
            {verdictFor(SCORE)}
          </div>
          <div className="mt-2">
            <ChangePill now={SCORE} previous={LAST_SESSION} />
          </div>
        </div>
      </Reveal>

      <Reveal progress={progress} {...w(2)} className={compact ? "pt-3.5" : "pt-4"}>
        <Kicker>Your 3 scores</Kicker>
      </Reveal>
      <div className="mt-1">
        {TILES.map((tile, i) => {
          const { from, to } = w(3 + i);
          return (
            <Reveal key={tile.name} progress={progress} from={from} to={to}>
              <TileRow
                compact={compact}
                progress={progress}
                tile={tile}
                // The bar fills as its row lands, trailing the fade slightly so
                // the fill is seen rather than arriving pre-drawn.
                window={progress ? [from + 0.015, to + 0.025] : undefined}
              />
            </Reveal>
          );
        })}
      </div>

      {!compact && <SessionsChart />}

      {/* The fix: a kicker and the one thing, then the drill as the system's
          info flash — a left rule on a tinted ground, never a box in a box. */}
      <Reveal progress={progress} {...w(6)} className={compact ? "pt-3.5" : "pt-4"}>
        <Kicker>Fix this one thing</Kicker>
        <div className="mt-2 text-title font-bold text-ink-900">Your bat swing</div>
        <p className="mt-1 text-body text-ink-800">{compact ? WEAKEST_SHORT : WEAKEST}</p>
      </Reveal>
      <Reveal progress={progress} {...w(7)} className={`border-b border-cream-400 ${compact ? "pt-2 pb-3" : "pt-3 pb-4"}`}>
        <p className="border-l-2 border-rust-500 bg-rust-50 px-3 py-2 text-ui text-ink-800">
          <span className="font-semibold text-ink-900">Your drill · </span>
          {DRILL}
        </p>
      </Reveal>

      <Reveal progress={progress} {...w(8)} className={`flex items-start gap-3 ${compact ? "pt-3 pb-1" : "py-4"}`}>
        <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-moss-600/15 text-caption text-moss-600">
          ✓
        </span>
        <div>
          <div className="text-body font-semibold text-ink-900">Approved by an ECB Level 3 coach</div>
          {!compact && (
            <p className="mt-1.5 text-caption text-ink-600 italic">
              &ldquo;Genuinely repeatable technique. Lock in the one thing above and the rest holds.&rdquo;
            </p>
          )}
        </div>
      </Reveal>
    </div>
  );
}

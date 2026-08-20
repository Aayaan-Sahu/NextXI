"use client";

import { motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { DRILL, WEAKEST, WEAKEST_SHORT } from "./report-data";

/**
 * Variant A — "Scoreboard": the card in the published simple mock. White card,
 * dark hero with an 0–100 dial, Last session / Elite level cells, three fat
 * green/red score bars, a fix-this-one-thing flash and a coach stamp.
 *
 * This is the marketing card only — product reports render measurement rows
 * (components/report-metric). It sits on the product's tokens: moss is the
 * system's one green (a positive verdict in a report), rust the negative,
 * amber the data emphasis on the dial.
 *
 * With a `progress` MotionValue (the pinned hero split) it reveals block by
 * block on the same schedule the editorial card used, and the dial draws and
 * bars fill as their block lands. Without one (/report-preview) it renders the
 * full card, settled and static.
 */

type ScoreTile = {
  name: string;
  score: number;
  note: string;
  delta: { text: string; dir: "up" | "down" | "same" };
};

const SCORE = 82;
const LAST_SESSION = 76;
/** The mock's elite cell — a target, always on, so the two-up row never collapses. */
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
    note: "Needs work. Bat comes down 4.1 cm off straight, costing you the most.",
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

const nextScoreFor = (score: number) => Math.min(94, score + 6);

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

/** Section heads inside the card: quiet ink, never the rust Kicker. */
function SectionLabel({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className={`text-micro font-semibold tracking-[.16em] uppercase ${
        dark ? "text-cream-200/70" : "text-ink-600"
      }`}
    >
      {children}
    </div>
  );
}

function Dial({
  value,
  compact,
  progress,
  window,
}: {
  value: number;
  compact: boolean;
  progress?: MotionValue<number>;
  window?: [number, number];
}) {
  const circumference = 2 * Math.PI * 44;
  const filled = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  const ramp = useRevealRamp(progress, window);
  const dash = useTransform(ramp, (k) => `${filled * k} ${circumference}`);
  const count = useTransform(ramp, (k) => Math.round(value * k));
  return (
    <div className={`relative mx-auto ${compact ? "size-[7.5rem]" : "size-36"}`}>
      <svg aria-hidden className="size-full -rotate-90" viewBox="0 0 100 100">
        <circle className="stroke-cream-200/15" cx="50" cy="50" fill="none" r="44" strokeWidth="8" />
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
        {/* The one oversized figure in the card: the session's number, sized
            like the guardian code on the dashboard rather than a row figure. */}
        <motion.span className="font-display text-[44px] leading-none font-bold tracking-[.02em] text-cream-50 tabular-nums">
          {count}
        </motion.span>
        <span className="mt-1 text-micro font-semibold tracking-[.16em] text-cream-200/70 uppercase">
          Out of 100
        </span>
      </div>
    </div>
  );
}

function ChangePill({ now, previous }: { now: number; previous: number }) {
  const delta = now - previous;
  const base = "rounded-full px-3 py-1 text-micro font-semibold tracking-[.04em]";
  if (Math.abs(delta) < 2) {
    return <span className={`${base} bg-cream-200/10 text-cream-200/70`}>About the same as last time</span>;
  }
  if (delta > 0) {
    return <span className={`${base} bg-moss-600 text-cream-50`}>▲ {delta} better than last time</span>;
  }
  return <span className={`${base} bg-rust-500 text-cream-50`}>▼ {-delta} down on last time</span>;
}

/** Dark hero: balls analysed, the dial, the verdict, the change pill; then the
    Last session / Elite level cells on the card body. */
function ReportHero({
  compact,
  progress,
  window,
}: {
  compact: boolean;
  progress?: MotionValue<number>;
  window?: [number, number];
}) {
  return (
    <>
      <div className={`bg-pitch-900 text-center ${compact ? "px-5 pt-5 pb-5" : "px-6 pt-5 pb-6"}`}>
        <div className="text-micro font-semibold tracking-[.16em] text-cream-200/70 uppercase">
          {compact ? "Aryaman · Front-foot drive · 12 balls" : "12 balls analysed"}
        </div>
        <div className={`flex justify-center ${compact ? "mt-3" : "mt-4"}`}>
          <Dial compact={compact} progress={progress} value={SCORE} window={window} />
        </div>
        <div
          className={`font-display leading-tight font-bold tracking-[.04em] text-cream-50 uppercase ${
            compact ? "mt-3 text-display" : "mt-4 text-title"
          }`}
        >
          {verdictFor(SCORE)}
        </div>
        <div className="mt-2.5">
          <ChangePill now={SCORE} previous={LAST_SESSION} />
        </div>
      </div>

      <div
        className={`grid grid-cols-2 divide-x divide-cream-300 border-b border-cream-300 text-center ${
          compact ? "px-5" : "px-6 sm:px-7"
        }`}
      >
        <div className={compact ? "py-2.5" : "py-3.5"}>
          <SectionLabel>Last session</SectionLabel>
          <div className={`mt-1 font-semibold text-ink-600 tabular-nums ${compact ? "text-figure" : "text-figure-sm"}`}>
            {LAST_SESSION}
          </div>
          {!compact && <div className="mt-1 text-micro text-ink-600">1 week ago</div>}
        </div>
        <div className={compact ? "py-2.5" : "py-3.5"}>
          <SectionLabel>Elite level</SectionLabel>
          <div className={`mt-1 font-semibold text-moss-600 tabular-nums ${compact ? "text-figure" : "text-figure-sm"}`}>
            {ELITE_LEVEL}
          </div>
          {!compact && <div className="mt-1 text-micro text-ink-600">the standard</div>}
        </div>
      </div>
    </>
  );
}

const good = (score: number) => score >= 70;

function DeltaMark({ delta }: { delta: ScoreTile["delta"] }) {
  if (delta.dir === "same") {
    return <span className="text-micro font-semibold text-ink-600">{delta.text}</span>;
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
      <span className={`text-micro font-semibold ${color}`}>{delta.text}</span>
    </span>
  );
}

function TileNote({ note }: { note: string }) {
  const dot = note.indexOf(". ");
  if (dot === -1) return <>{note}</>;
  return (
    <>
      <span className="font-semibold">{note.slice(0, dot + 1)}</span>
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
    <div className={`border-b border-cream-300 last:border-b-0 ${compact ? "py-2.5" : "py-3.5"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body font-semibold text-ink-900">{tile.name}</span>
        <span className="flex items-baseline gap-2">
          <DeltaMark delta={tile.delta} />
          <span
            className={`text-figure-sm font-semibold tabular-nums ${ok ? "text-moss-600" : "text-rust-600"}`}
          >
            {tile.score}
          </span>
        </span>
      </div>
      <div
        className={`relative mt-1.5 overflow-hidden rounded-full bg-cream-300 ${compact ? "h-3" : "h-3.5"}`}
        aria-hidden
      >
        <motion.div
          className={`h-full rounded-full ${ok ? "bg-moss-600" : "bg-rust-600"}`}
          style={{ width }}
        />
        <div className="absolute inset-y-0 w-px bg-ink-900/45" style={{ left: `${ELITE_LEVEL}%` }} />
      </div>
      <p className={`mt-1.5 text-ink-800 ${compact ? "line-clamp-1 text-ui" : "text-caption"}`}>
        <TileNote note={tile.note} />
      </p>
    </div>
  );
}

/** Always six columns so the trail matches the mock; the standalone card only. */
function SessionsChart() {
  return (
    <div className="border-b border-cream-300 py-4">
      <SectionLabel>Last 6 sessions</SectionLabel>
      <div className="mt-3 flex items-end gap-1.5" aria-hidden>
        {HISTORY.map((value, index) => {
          const today = index === HISTORY.length - 1;
          return (
            <div className="flex-1" key={index}>
              <div
                className={`text-center text-micro font-semibold tabular-nums ${
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
      <div className="mt-1.5 flex justify-between text-micro text-ink-600">
        <span>6 weeks ago</span>
        <span className="text-amber-500">today</span>
      </div>
      <p className="mt-2 text-micro text-ink-600">Score per session — how the technique has been tracking.</p>
    </div>
  );
}

/** The "fix this one thing" flash: rust, the system's attention colour — never
    peach, which is the primary action. */
function FocusBlock({ compact }: { compact: boolean }) {
  return (
    <div
      className={`rounded-[10px] border border-rust-300/60 bg-rust-50 ${
        compact ? "mt-3 px-4 pt-3 pb-3.5" : "my-4 px-4 pt-3.5 pb-4"
      }`}
    >
      <div className="font-display text-micro font-bold tracking-[.16em] text-rust-600 uppercase">
        Fix this one thing
      </div>
      <div className="mt-1 text-title font-bold text-ink-900">Your bat swing</div>
      <p className={`mt-1 text-ink-800 ${compact ? "line-clamp-2 text-ui" : "text-caption"}`}>
        {compact ? WEAKEST_SHORT : WEAKEST}
      </p>
      <div className="mt-2.5 rounded-lg border border-cream-400 bg-white px-3 py-2">
        <SectionLabel>Your drill</SectionLabel>
        <p className={`mt-1 text-ink-800 ${compact ? "line-clamp-2 text-ui" : "text-caption"}`}>{DRILL}</p>
      </div>
      <p className="mt-2.5 text-caption font-semibold text-rust-600">
        → Fix this and your score becomes {nextScoreFor(SCORE)}
      </p>
    </div>
  );
}

function CoachStamp({ compact }: { compact: boolean }) {
  return (
    <div className={`flex items-start gap-3 ${compact ? "pt-3 pb-1" : "py-4"}`}>
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-moss-600/15 text-caption text-moss-600">
        ✓
      </span>
      <div>
        <div className="font-display text-caption font-semibold tracking-[.06em] text-ink-900 uppercase">
          This report is approved by an ECB Level 3 coach
        </div>
        {!compact && (
          <p className="mt-1.5 text-caption text-ink-600 italic">
            &ldquo;Genuinely repeatable technique. Lock in the one thing above and the rest holds.&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

export function VariantScoreboard({ progress }: { progress?: MotionValue<number> } = {}) {
  const compact = !!progress;
  // Seven reveal blocks (hero, cells, three score rows, focus, stamp) on the
  // hero split's schedule — every from/to must stay inside [0,1] or Motion's
  // ScrollTimeline throws ("offsets must be in range [0,1]").
  const S = 0.62;
  const step = 0.043;
  const dur = 0.05;
  const w = (i: number) => ({ from: S + i * step, to: S + i * step + dur });

  return (
    // Shadow only in the pinned hero, where the card genuinely floats over the
    // footage. On /report-preview it is a resting card, and a resting card
    // never has one.
    <div
      className={`overflow-hidden rounded-[10px] border border-cream-400 bg-cream-50 text-ink-900 ${
        compact ? "shadow-float" : ""
      }`}
    >
      {/* The hero's dark block and the cells reveal separately so the card
          still builds top-down, but the dial draws across both beats. */}
      <Reveal progress={progress} {...w(0)}>
        <ReportHero compact={compact} progress={progress} window={progress ? [S, S + 0.1] : undefined} />
      </Reveal>
      <div className={compact ? "px-5 pb-3" : "px-6 pb-4 sm:px-7"}>
        <Reveal progress={progress} {...w(1)} className={compact ? "pt-2.5" : "pt-4"}>
          <SectionLabel>Your 3 scores</SectionLabel>
        </Reveal>
        <div className="border-b border-cream-300">
          {TILES.map((tile, i) => {
            const { from, to } = w(2 + i);
            return (
              <Reveal key={tile.name} progress={progress} from={from} to={to}>
                <TileRow
                  compact={compact}
                  progress={progress}
                  tile={tile}
                  // The bar fills as its row lands, trailing the fade slightly
                  // so the fill is seen rather than arriving pre-drawn.
                  window={progress ? [from + 0.015, to + 0.025] : undefined}
                />
              </Reveal>
            );
          })}
        </div>
        {!compact && <SessionsChart />}
        <Reveal progress={progress} {...w(5)}>
          <FocusBlock compact={compact} />
        </Reveal>
        <Reveal progress={progress} {...w(6)}>
          <CoachStamp compact={compact} />
        </Reveal>
      </div>
    </div>
  );
}

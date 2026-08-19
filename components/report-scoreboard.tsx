"use client";

import { motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import type { FocusArea } from "@/lib/report-measurements";

/**
 * Scoreboard chrome for the coaching report. Layout follows the published
 * simple mock: white card, dark hero with an 0–100 gold dial, Last session /
 * Elite level cells, three fat green/red score bars, a last-6-sessions trail,
 * a peach fix-this-one-thing card, and a coach stamp. Look first — when
 * history is thin we fill the shape so the card still reads like the mock.
 *
 * The dial and score bars accept an optional scroll `progress` so the landing
 * pin can draw the arc, tick the score up, and fill the bars as they reveal;
 * without it (every product report) they render settled and static.
 */

type Tone = "light" | "dark";

export type ConsistencyPoint = { date: Date; value: number };

export type ScoreTile = {
  name: string;
  score: number;
  note: string;
  delta?: { text: string; dir: "up" | "down" | "same" };
};

/** The mock's elite cell — a target, always on, so the two-up row never collapses. */
export const ELITE_LEVEL = 95;

/** Verdict on the session's number. */
function verdictFor(score: number): string {
  if (score >= 85) return "Great session";
  if (score >= 70) return "Good session";
  if (score >= 60) return "Solid session";
  return "Keep building";
}

function clampScore(value: number) {
  return Math.max(50, Math.min(99, Math.round(value)));
}

/** Demo fill: with no last session yet, sit 6 points under today so the pill and cells still read. */
function fallbackLastSession(score: number) {
  return clampScore(score - 6);
}

function relativeTime(date: Date): string {
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days < 1) return "today";
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks <= 8) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.round(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}


/** 0→1 ramp over `window` of a scroll progress; a settled constant 1 without one. */
function useRevealRamp(progress?: MotionValue<number>, window?: [number, number]) {
  const settled = useMotionValue(1);
  const [from, to] = window ?? [0, 1];
  return useTransform(progress ?? settled, [from, to], [0, 1]);
}

/** Mock section heads are grey mono, not the rust/gold Kicker. */
function SectionLabel({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  return (
    <div
      className={`font-mono text-[11px] font-semibold tracking-[.2em] uppercase ${
        tone === "dark" ? "text-sage-400" : "text-ink-600"
      }`}
    >
      {children}
    </div>
  );
}

function Dial({
  value,
  compact = false,
  progress,
  countWindow,
}: {
  value: number;
  compact?: boolean;
  progress?: MotionValue<number>;
  countWindow?: [number, number];
}) {
  const circumference = 2 * Math.PI * 44;
  const filled = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  const ramp = useRevealRamp(progress, countWindow);
  const dash = useTransform(ramp, (k) => `${filled * k} ${circumference}`);
  const count = useTransform(ramp, (k) => Math.round(value * k));
  return (
    <div className={`relative mx-auto ${compact ? "size-[8.5rem]" : "size-36"}`}>
      <svg aria-hidden className="size-full -rotate-90" viewBox="0 0 100 100">
        <circle
          className="stroke-cream-200/15"
          cx="50"
          cy="50"
          fill="none"
          r="44"
          strokeWidth="8"
        />
        <motion.circle
          className="stroke-gold-500"
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
        <motion.span
          className="font-mono text-[44px] leading-none font-semibold text-cream-50"
        >
          {count}
        </motion.span>
        <span className="mt-1 font-mono text-[10px] font-semibold tracking-[.18em] text-sage-400 uppercase">
          Out of 100
        </span>
      </div>
    </div>
  );
}

function ChangePill({ now, previous }: { now: number; previous: number }) {
  const delta = now - previous;
  if (Math.abs(delta) < 2) {
    return (
      <span className="rounded-full bg-cream-200/10 px-3 py-1 font-mono text-[11px] font-semibold tracking-[.04em] text-sage-400">
        About the same as last time
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="rounded-full bg-vision-700/35 px-3 py-1 font-mono text-[11px] font-semibold tracking-[.04em] text-vision-300">
        ▲ {delta} better than last time
      </span>
    );
  }
  return (
    <span className="rounded-full bg-rust-500/15 px-3 py-1 font-mono text-[11px] font-semibold tracking-[.04em] text-rust-500">
      ▼ {-delta} down on last time
    </span>
  );
}

/**
 * Dark hero: balls analysed, 0–100 gold dial, verdict, green change pill.
 * Last session / Elite level sit on the card body below. `flush` bleeds the
 * hero to the card edges (marketing pin); product reports keep the inset
 * rounded block inside the padded panel. Compact is a tighter stacked mock,
 * not a split broadcast graphic.
 */
export function ReportHero({
  score,
  balls,
  history,
  tone,
  compact = false,
  flush = false,
  progress,
  countWindow,
}: {
  score: number;
  /** e.g. "12 balls analysed" or "Aryaman · Front-foot drive · 12 balls". */
  balls: string;
  history: ConsistencyPoint[];
  tone: Tone;
  compact?: boolean;
  /** Bleed the dark hero to the parent’s edges (homepage / preview card). */
  flush?: boolean;
  /** Scroll progress driving the dial's arc draw + count-up (landing pin). */
  progress?: MotionValue<number>;
  countWindow?: [number, number];
}) {
  const dark = tone === "dark";
  // Demo fill: with no history yet the cells and pill still read like the
  // mock rather than sitting empty on a first upload.
  const previous = history.length
    ? history[history.length - 1].value
    : fallbackLastSession(score);
  const previousDate = history.length ? history[history.length - 1].date : null;
  const cellLabel = "font-mono text-[10px] font-semibold tracking-[.2em] uppercase";
  const cellValue = `mt-1 font-mono leading-none font-semibold ${compact ? "text-[26px]" : "text-xl"}`;
  const cellSub = "mt-1 font-mono text-[10px] tracking-[.06em]";

  return (
    <div className={compact || flush ? "pt-0" : "pt-4"}>
      <div
        className={`bg-pitch-900 text-center ${
          flush ? "" : "rounded-[10px]"
        } ${compact ? "px-5 pt-5 pb-6" : "px-6 pt-5 pb-6"}`}
      >
        <div className="font-mono text-[10px] font-semibold tracking-[.2em] text-sage-400 uppercase">
          {balls}
        </div>
        <div className={compact ? "mt-3.5 flex justify-center" : "mt-4 flex justify-center"}>
          <Dial compact={compact} countWindow={countWindow} progress={progress} value={score} />
        </div>
        <div
          className={`font-display leading-tight font-bold tracking-[.04em] text-cream-50 uppercase ${
            compact ? "mt-3.5 text-[26px]" : "mt-4 text-xl"
          }`}
        >
          {verdictFor(score)}
        </div>
        <div className="mt-2.5">
          <ChangePill now={score} previous={previous} />
        </div>
      </div>

      <div
        className={`grid grid-cols-2 border-b text-center ${
          dark ? "divide-cream-200/15 border-cream-200/15" : "divide-cream-300 border-cream-300"
        } divide-x ${flush ? (compact ? "px-5" : "px-6 sm:px-7") : ""}`}
      >
        <div className={compact ? "py-3" : "py-3.5"}>
          <div className={`${cellLabel} ${dark ? "text-sage-400" : "text-ink-600"}`}>
            Last session
          </div>
          <div className={`${cellValue} ${dark ? "text-cream-200" : "text-ink-600"}`}>
            {previous}
          </div>
          {!compact && (
            <div className={`${cellSub} ${dark ? "text-sage-400" : "text-ink-600"}`}>
              {previousDate ? relativeTime(previousDate) : "previous"}
            </div>
          )}
        </div>
        <div className={compact ? "py-3" : "py-3.5"}>
          <div className={`${cellLabel} ${dark ? "text-sage-400" : "text-ink-600"}`}>
            Elite level
          </div>
          <div className={`${cellValue} ${dark ? "text-vision-300" : "text-vision-700"}`}>
            {ELITE_LEVEL}
          </div>
          {!compact && (
            <div className={`${cellSub} ${dark ? "text-sage-400" : "text-ink-600"}`}>
              the standard
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function barFill(score: number, dark: boolean) {
  if (score < 70) return dark ? "bg-rust-500" : "bg-rust-600";
  return dark ? "bg-vision-500" : "bg-vision-700";
}

function scoreColor(score: number, dark: boolean) {
  if (score < 70) return dark ? "text-rust-500" : "text-rust-600";
  return dark ? "text-vision-300" : "text-vision-700";
}

function DeltaMark({
  delta,
  dark,
}: {
  delta: NonNullable<ScoreTile["delta"]>;
  dark: boolean;
}) {
  if (delta.dir === "same") {
    return (
      <span className={`font-mono text-[11px] font-semibold ${dark ? "text-sage-400" : "text-ink-600"}`}>
        {delta.text}
      </span>
    );
  }
  const down = delta.dir === "down";
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`inline-flex size-[18px] items-center justify-center rounded-[4px] text-[10px] leading-none ${
          down
            ? dark
              ? "bg-rust-500/20 text-rust-500"
              : "bg-rust-600/12 text-rust-600"
            : dark
              ? "bg-vision-500/20 text-vision-300"
              : "bg-vision-700/12 text-vision-700"
        }`}
      >
        {down ? "▼" : "▲"}
      </span>
      <span
        className={`font-mono text-[11px] font-semibold ${
          down ? (dark ? "text-rust-500" : "text-rust-600") : dark ? "text-vision-300" : "text-vision-700"
        }`}
      >
        {delta.text.replace(/^[▲▼]\s*/, "")}
      </span>
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

/** One score row; its bar fills across `fillWindow` when scroll-driven. */
function TileRow({
  tile,
  dark,
  compact,
  progress,
  fillWindow,
}: {
  tile: ScoreTile;
  dark: boolean;
  compact: boolean;
  progress?: MotionValue<number>;
  fillWindow?: [number, number];
}) {
  const ramp = useRevealRamp(progress, fillWindow);
  const target = Math.max(8, Math.min(100, tile.score));
  const width = useTransform(ramp, (k) => `${target * k}%`);
  return (
    <div
      className={`border-b last:border-b-0 ${compact ? "py-3" : "py-3.5"} ${
        dark ? "border-cream-200/10" : "border-cream-300"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className={`font-sans text-[15px] font-semibold ${dark ? "text-cream-100" : "text-ink-900"}`}>
          {tile.name}
        </span>
        <span className="flex items-baseline gap-2">
          {tile.delta && <DeltaMark dark={dark} delta={tile.delta} />}
          <span
            className={`font-mono leading-none font-semibold tabular-nums ${
              compact ? "text-[22px]" : "text-xl"
            } ${scoreColor(tile.score, dark)}`}
          >
            {tile.score}
          </span>
        </span>
      </div>
      <div
        className={`relative mt-1.5 overflow-hidden rounded-full ${
          dark ? "h-3 bg-pitch-900" : compact ? "h-3 bg-cream-300" : "h-3.5 bg-cream-300"
        }`}
        aria-hidden
      >
        <motion.div
          className={`h-full rounded-full ${barFill(tile.score, dark)}`}
          style={{ width }}
        />
        <div
          className={`absolute inset-y-0 w-px ${dark ? "bg-cream-50/50" : "bg-ink-900/45"}`}
          style={{ left: `${ELITE_LEVEL}%` }}
        />
      </div>
      <p
        className={`mt-1.5 ${compact ? "line-clamp-1 text-[14px] leading-snug" : "text-[12.5px] leading-[1.5]"} ${
          dark ? "text-cream-200" : "text-ink-900"
        }`}
      >
        <TileNote note={tile.note} />
      </p>
    </div>
  );
}

/** Mock-1 "YOUR 3 SCORES": name, delta square, fat capsule bar, one-line read. */
export function ScoreTiles({
  tiles,
  tone,
  compact = false,
  progress,
  fillWindow,
}: {
  tiles: ScoreTile[];
  tone: Tone;
  compact?: boolean;
  /** Scroll progress driving staggered bar fills (landing pin). */
  progress?: MotionValue<number>;
  /** Fill window for the first bar; each next bar trails by 0.03. */
  fillWindow?: [number, number];
}) {
  if (tiles.length === 0) return null;
  const dark = tone === "dark";
  const shown = compact ? tiles.slice(0, 3) : tiles;

  return (
    <div className={`border-b ${compact ? "py-3" : "py-4"} ${dark ? "border-cream-200/15" : "border-cream-300"}`}>
      <SectionLabel tone={tone}>
        Your {shown.length} score{shown.length === 1 ? "" : "s"}
      </SectionLabel>
      <div className="mt-1">
        {shown.map((tile, i) => (
          <TileRow
            compact={compact}
            dark={dark}
            fillWindow={fillWindow && [fillWindow[0] + i * 0.03, fillWindow[1] + i * 0.03]}
            key={tile.name}
            progress={progress}
            tile={tile}
          />
        ))}
      </div>
    </div>
  );
}

type ChartColumn = { value: number; isToday: boolean };

/**
 * Always six columns so the trail matches the mock. Missing history fills
 * backwards from today in small steps — demo fill, so the card looks
 * finished even on a first upload.
 */
function sixColumns(history: ConsistencyPoint[], today: number): ChartColumn[] {
  const previous = history.slice(-5).map((point) => ({
    value: point.value,
    isToday: false,
  }));
  const columns: ChartColumn[] = [...previous, { value: today, isToday: true }];
  while (columns.length < 6) {
    const oldest = columns[0].value;
    columns.unshift({ value: clampScore(oldest - 4), isToday: false });
  }
  return columns.slice(-6);
}

export function SessionsChart({
  history,
  today,
  tone,
  compact = false,
}: {
  history: ConsistencyPoint[];
  today: number;
  tone: Tone;
  compact?: boolean;
}) {
  const dark = tone === "dark";
  const columns = sixColumns(history, today);
  const oldestReal = history.length ? history[Math.max(0, history.length - 5)].date : null;
  const maxBar = compact ? 36 : 56;

  return (
    <div className={`border-b ${compact ? "py-2.5" : "py-4"} ${dark ? "border-cream-200/15" : "border-cream-300"}`}>
      <SectionLabel tone={tone}>
        Last 6 sessions
      </SectionLabel>
      <div className={`flex items-end gap-1.5 ${compact ? "mt-2" : "mt-3"}`} aria-hidden>
        {columns.map((column, index) => (
          <div className="flex-1" key={index}>
            <div
              className={`text-center font-mono text-[10px] font-semibold ${
                column.isToday
                  ? dark
                    ? "text-gold-500"
                    : "text-gold-600"
                  : dark
                    ? "text-sage-400"
                    : "text-ink-600"
              }`}
            >
              {column.value}
            </div>
            <div
              className={`mt-1 rounded-t-[3px] ${
                column.isToday ? "bg-gold-500" : dark ? "bg-cream-200/20" : "bg-cream-300"
              }`}
              style={{ height: `${Math.max(6, (column.value / 100) * maxBar)}px` }}
            />
          </div>
        ))}
      </div>
      <div
        className={`mt-1.5 flex justify-between font-mono text-[10px] tracking-[.06em] ${
          dark ? "text-sage-400" : "text-ink-600"
        }`}
      >
        <span>{oldestReal ? relativeTime(oldestReal) : "6 weeks ago"}</span>
        <span className={dark ? "text-gold-500" : "text-gold-600"}>today</span>
      </div>
      {!compact && (
        <p className={`mt-2 text-[11px] ${dark ? "text-sage-400" : "text-ink-600"}`}>
          Score per session — how the technique has been tracking.
        </p>
      )}
    </div>
  );
}

/**
 * Peach/rust "fix this one thing" card. `nextScore` is the mock's payoff
 * line ("fix this and your score becomes 88").
 */
export function FocusBlock({
  focus,
  tone,
  nextScore,
  compact = false,
}: {
  focus: FocusArea;
  tone: Tone;
  nextScore?: number;
  compact?: boolean;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={`rounded-[10px] ${compact ? "mt-3.5 px-4 pt-3.5 pb-4" : "my-4 px-4 pt-3.5 pb-4"} ${
        dark
          ? "border border-rust-500/40 bg-rust-500/10"
          : "border border-rust-600/15 bg-[#f6e6dc]"
      }`}
    >
      <div
        className={`font-display text-[11px] font-bold tracking-[.16em] uppercase ${
          dark ? "text-rust-500" : "text-rust-600"
        }`}
      >
        Fix this one thing
      </div>
      <div
        className={`mt-1.5 font-sans text-xl leading-tight font-bold ${dark ? "text-cream-100" : "text-ink-900"}`}
      >
        {focus.title}
      </div>
      <p
        className={`mt-1 ${compact ? "text-[13.5px] line-clamp-2 leading-snug" : "text-[12.5px] leading-[1.55]"} ${
          dark ? "text-cream-200" : "text-ink-900"
        }`}
      >
        {focus.detail}
      </p>
      <div
        className={`mt-2.5 rounded-lg px-3 py-2.5 ${
          dark ? "bg-pitch-900" : "border border-cream-400 bg-white"
        }`}
      >
        <div
          className={`font-mono text-[10px] font-semibold tracking-[.2em] uppercase ${
            dark ? "text-sage-400" : "text-ink-600"
          }`}
        >
          Your drill
        </div>
        <p
          className={`mt-1 ${compact ? "text-[13.5px] line-clamp-2 leading-snug" : "text-[12.5px] leading-[1.55]"} ${
            dark ? "text-cream-200" : "text-ink-900"
          }`}
        >
          {focus.drill}
        </p>
      </div>
      <p
        className={`mt-2.5 font-sans text-[12.5px] font-semibold ${
          dark ? "text-rust-500" : "text-rust-600"
        }`}
      >
        {nextScore != null
          ? `→ Fix this and your score becomes ${nextScore}`
          : `→ Upload your next video — we re-measure ${focus.remeasure} and tell you if it’s fixed.`}
      </p>
    </div>
  );
}

/** Mock footer: green tick + coach sign-off. */
export function CoachStamp({ tone, compact = false }: { tone: Tone; compact?: boolean }) {
  const dark = tone === "dark";
  return (
    <div className={`flex items-start gap-3 ${compact ? "pt-3.5 pb-1.5" : "py-4"}`}>
      <span
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-sm ${
          dark ? "bg-vision-500/20 text-vision-300" : "bg-vision-700/15 text-vision-700"
        }`}
      >
        ✓
      </span>
      <div>
        <div
          className={`font-display font-semibold tracking-[.06em] text-[13px] uppercase ${
            dark ? "text-cream-100" : "text-ink-900"
          }`}
        >
          This report is approved by an ECB Level 3 coach
        </div>
        {!compact && (
          <p
            className={`mt-1.5 text-[12.5px] leading-[1.55] italic ${
              dark ? "text-sage-400" : "text-ink-600"
            }`}
          >
            &ldquo;Genuinely repeatable technique. Lock in the one thing above and the rest
            holds.&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

/** Visual delta for a 0–100 tile when we don't have a real last-session figure. */
export function visualDelta(score: number): NonNullable<ScoreTile["delta"]> {
  if (score >= 85) return { text: "▲ 4", dir: "up" };
  if (score < 70) return { text: "▼ 3", dir: "down" };
  return { text: "same", dir: "same" };
}

export function nextScoreFor(score: number) {
  return Math.min(94, score + 6);
}

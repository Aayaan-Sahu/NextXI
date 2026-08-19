import { Kicker } from "@/components/ui";
import type { FocusArea } from "@/lib/report-measurements";

/**
 * Scoreboard chrome for the coaching report: the consistency hero (dial,
 * verdict, change vs last time, Last session / Your best cells), the
 * last-N-sessions chart, and the "fix this one thing" block.
 *
 * Everything here is powered by the headline consistency figure and the
 * worker's own labels — both self-referential, so verdict words are
 * defensible. No elite numbers, no invented 0-100 technique scores: the
 * mock's "Elite level" cell is deliberately "Your best" here (see
 * docs/BENCHMARKS.md for why).
 */

type Tone = "light" | "dark";

export type ConsistencyPoint = { date: Date; value: number };

/** Verdict on the session's repeatability — of itself, not of talent. */
function verdictFor(consistency: number): string {
  if (consistency >= 85) return "Great session";
  if (consistency >= 70) return "Good session";
  if (consistency >= 60) return "Solid session";
  return "Keep building";
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

function Dial({ value, tone }: { value: number; tone: Tone }) {
  const dark = tone === "dark";
  // r=45 in a 100-box; the arc starts at 12 o'clock and fills clockwise.
  const circumference = 2 * Math.PI * 45;
  const filled = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  return (
    <div className="relative size-32">
      <svg aria-hidden className="size-full -rotate-90" viewBox="0 0 100 100">
        <circle
          className={dark ? "stroke-cream-200/15" : "stroke-cream-200/25"}
          cx="50"
          cy="50"
          fill="none"
          r="45"
          strokeWidth="7"
        />
        <circle
          className="stroke-gold-500"
          cx="50"
          cy="50"
          fill="none"
          r="45"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          strokeWidth="7"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl leading-none font-semibold text-cream-50">
          {value}
        </span>
        <span className="mt-1 font-mono text-[10px] font-semibold tracking-[.14em] text-sage-400 uppercase">
          % consistent
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
      <span className="rounded-full bg-vision-500/15 px-3 py-1 font-mono text-[11px] font-semibold tracking-[.04em] text-vision-500">
        ▲ {delta} steadier than last time
      </span>
    );
  }
  return (
    <span className="rounded-full bg-rust-500/15 px-3 py-1 font-mono text-[11px] font-semibold tracking-[.04em] text-rust-500">
      ▼ {-delta} less steady than last time
    </span>
  );
}

/**
 * The dark hero at the top of a batting report: how many balls, the
 * consistency dial, a plain verdict, the change vs last session, and the
 * Last session / Your best cells. `history` is oldest-first.
 */
export function ReportHero({
  consistency,
  balls,
  history,
  tone,
}: {
  consistency: number;
  /** e.g. "12 balls analysed". */
  balls: string;
  history: ConsistencyPoint[];
  tone: Tone;
}) {
  const dark = tone === "dark";
  const previous = history.length ? history[history.length - 1] : null;
  const bestPrevious = history.length
    ? Math.max(...history.map((point) => point.value))
    : null;
  const bestIsNow = bestPrevious === null || consistency >= bestPrevious;
  const cellLabel = "font-mono text-[10px] font-semibold tracking-[.2em] uppercase";
  const cellValue = "mt-1 font-mono text-xl leading-none font-semibold";
  const cellSub = "mt-1 font-mono text-[10px] tracking-[.06em]";

  return (
    <div className="pt-4">
      <div
        className={`rounded-[10px] px-6 pt-5 pb-6 text-center ${
          dark ? "bg-black/25" : "bg-pitch-900"
        }`}
      >
        <div className="font-mono text-[10px] font-semibold tracking-[.2em] text-sage-400 uppercase">
          {balls}
        </div>
        <div className="mt-4 flex justify-center">
          <Dial value={consistency} tone={tone} />
        </div>
        <div className="mt-4 font-display text-xl leading-tight font-bold tracking-[.04em] text-cream-50 uppercase">
          {verdictFor(consistency)}
        </div>
        <div className="mt-2.5">
          {previous ? (
            <ChangePill now={consistency} previous={previous.value} />
          ) : (
            <span className="rounded-full bg-cream-200/10 px-3 py-1 font-mono text-[11px] font-semibold tracking-[.04em] text-sage-400">
              First analysed session — your scoreboard starts here
            </span>
          )}
        </div>
      </div>

      {previous && (
        <div
          className={`grid grid-cols-2 border-b text-center ${
            dark ? "divide-cream-200/15 border-cream-200/15" : "divide-cream-300 border-cream-300"
          } divide-x`}
        >
          <div className="py-3.5">
            <div className={`${cellLabel} ${dark ? "text-sage-400" : "text-ink-600"}`}>
              Last session
            </div>
            <div className={`${cellValue} ${dark ? "text-cream-200" : "text-ink-600"}`}>
              {previous.value}
            </div>
            <div className={`${cellSub} ${dark ? "text-sage-400" : "text-ink-600"}`}>
              {relativeTime(previous.date)}
            </div>
          </div>
          <div className="py-3.5">
            <div className={`${cellLabel} ${dark ? "text-sage-400" : "text-ink-600"}`}>
              Your best
            </div>
            <div className={`${cellValue} ${dark ? "text-gold-500" : "text-gold-600"}`}>
              {bestIsNow ? consistency : bestPrevious}
            </div>
            <div className={`${cellSub} ${dark ? "text-sage-400" : "text-ink-600"}`}>
              {bestIsNow ? "this session" : `of ${history.length + 1} sessions`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Consistency across the recent sessions as small columns, today in gold.
 * Column height is the actual 0-100 value — no re-scaling that would
 * exaggerate a two-point wobble into a cliff.
 */
export function SessionsChart({
  history,
  today,
  tone,
}: {
  history: ConsistencyPoint[];
  today: number;
  tone: Tone;
}) {
  const dark = tone === "dark";
  const points = history.slice(-5);
  if (points.length === 0) return null;
  const columns = [
    ...points.map((point) => ({ value: point.value, isToday: false })),
    { value: today, isToday: true },
  ];

  return (
    <div className={`border-b py-4 ${dark ? "border-cream-200/15" : "border-cream-300"}`}>
      <Kicker tone={tone}>Last {columns.length} sessions</Kicker>
      <div className="mt-3 flex items-end gap-1.5" aria-hidden>
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
              style={{ height: `${Math.max(6, (column.value / 100) * 56)}px` }}
            />
          </div>
        ))}
      </div>
      <div
        className={`mt-1.5 flex justify-between font-mono text-[10px] tracking-[.06em] ${
          dark ? "text-sage-400" : "text-ink-600"
        }`}
      >
        <span>{relativeTime(points[0].date)}</span>
        <span className={dark ? "text-gold-500" : "text-gold-600"}>today</span>
      </div>
      <p className={`mt-2 text-[11px] ${dark ? "text-sage-400" : "text-ink-600"}`}>
        Consistency per session — how repeatable your technique was, ball to ball.
      </p>
    </div>
  );
}

/**
 * "Fix this one thing": the judgement that read worst this session, with a
 * curated drill and what the next upload re-measures. Renders only when the
 * session honestly produced a focus (lib/report-measurements.ts).
 */
export function FocusBlock({ focus, tone }: { focus: FocusArea; tone: Tone }) {
  const dark = tone === "dark";
  return (
    <div
      className={`my-4 rounded-[10px] border px-4 pt-3.5 pb-4 ${
        dark ? "border-rust-500/40 bg-black/25" : "border-rust-600/25 bg-rust-600/[0.05]"
      }`}
    >
      <div
        className={`font-mono text-[11px] font-semibold tracking-[.2em] uppercase ${
          dark ? "text-rust-500" : "text-rust-600"
        }`}
      >
        Fix this one thing
      </div>
      <div
        className={`mt-2 font-display text-xl leading-tight font-bold tracking-[.04em] uppercase ${
          dark ? "text-cream-100" : "text-ink-900"
        }`}
      >
        {focus.title}
      </div>
      <p className={`mt-1.5 text-[12.5px] leading-[1.55] ${dark ? "text-cream-200" : "text-ink-900"}`}>
        {focus.detail}
      </p>
      <div
        className={`mt-3 rounded-md px-3.5 py-3 ${
          dark ? "bg-black/30" : "border border-cream-300 bg-white"
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
          className={`mt-1.5 text-[12.5px] leading-[1.55] ${
            dark ? "text-cream-200" : "text-ink-900"
          }`}
        >
          {focus.drill}
        </p>
      </div>
      <p
        className={`mt-3 font-mono text-[11px] font-semibold tracking-[.02em] ${
          dark ? "text-rust-500" : "text-rust-600"
        }`}
      >
        → Upload your next video — we re-measure {focus.remeasure}
        {" and tell you if it’s fixed."}
      </p>
    </div>
  );
}

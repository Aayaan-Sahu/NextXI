import { Kicker } from "@/components/ui";
import type { FocusArea } from "@/lib/report-measurements";

/**
 * Scoreboard chrome for the coaching report. Layout follows the published
 * mocks: dark hero with an 0–100 dial, Last session / Elite level cells,
 * three fat score bars, a last-6-sessions trail, a fix-this-one-thing card,
 * and a coach stamp. Look first — when history is thin we fill the shape
 * so the card still reads like the mock.
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

function relativeTime(date: Date): string {
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days < 1) return "today";
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks <= 8) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.round(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function clampScore(value: number) {
  return Math.max(50, Math.min(99, Math.round(value)));
}

/** When there's no last session yet, sit 6 points under today so the pill and cells still read. */
export function fallbackLastSession(score: number) {
  return clampScore(score - 6);
}

function Dial({ value, tone }: { value: number; tone: Tone }) {
  const dark = tone === "dark";
  const circumference = 2 * Math.PI * 45;
  const filled = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  return (
    <div className="relative size-36">
      <svg aria-hidden className="size-full -rotate-90" viewBox="0 0 100 100">
        <circle
          className={dark ? "stroke-cream-200/15" : "stroke-cream-200/20"}
          cx="50"
          cy="50"
          fill="none"
          r="45"
          strokeWidth="6"
        />
        <circle
          className="stroke-gold-500"
          cx="50"
          cy="50"
          fill="none"
          r="45"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          strokeWidth="6"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[44px] leading-none font-semibold text-cream-50">
          {value}
        </span>
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
      <span className="rounded-full bg-vision-500/15 px-3 py-1 font-mono text-[11px] font-semibold tracking-[.04em] text-vision-500">
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
 * Dark hero: balls analysed, 0–100 dial, verdict, change pill. The Last
 * session / Elite level cells sit on the card below, on whatever tone the
 * report is using — same split as the simple mock.
 */
export function ReportHero({
  score,
  balls,
  history,
  tone,
}: {
  score: number;
  /** e.g. "12 balls analysed". */
  balls: string;
  history: ConsistencyPoint[];
  tone: Tone;
}) {
  const dark = tone === "dark";
  const previous = history.length
    ? history[history.length - 1].value
    : fallbackLastSession(score);
  const previousDate = history.length ? history[history.length - 1].date : null;
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
          <Dial value={score} tone={tone} />
        </div>
        <div className="mt-4 font-display text-xl leading-tight font-bold tracking-[.04em] text-cream-50 uppercase">
          {verdictFor(score)}
        </div>
        <div className="mt-2.5">
          <ChangePill now={score} previous={previous} />
        </div>
      </div>

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
            {previous}
          </div>
          <div className={`${cellSub} ${dark ? "text-sage-400" : "text-ink-600"}`}>
            {previousDate ? relativeTime(previousDate) : "previous"}
          </div>
        </div>
        <div className="py-3.5">
          <div className={`${cellLabel} ${dark ? "text-sage-400" : "text-ink-600"}`}>
            Elite level
          </div>
          <div className={`${cellValue} ${dark ? "text-vision-500" : "text-vision-700"}`}>
            {ELITE_LEVEL}
          </div>
          <div className={`${cellSub} ${dark ? "text-sage-400" : "text-ink-600"}`}>
            the standard
          </div>
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
  return dark ? "text-vision-500" : "text-vision-700";
}

/** Mock-1 "YOUR 3 SCORES": name, delta, fat coloured bar, one-line read. */
export function ScoreTiles({ tiles, tone }: { tiles: ScoreTile[]; tone: Tone }) {
  if (tiles.length === 0) return null;
  const dark = tone === "dark";

  return (
    <div className={`border-b py-4 ${dark ? "border-cream-200/15" : "border-cream-300"}`}>
      <Kicker tone={tone}>
        Your {tiles.length} score{tiles.length === 1 ? "" : "s"}
      </Kicker>
      <div className="mt-1">
        {tiles.map((tile) => (
          <div
            className={`border-b py-3.5 last:border-b-0 ${
              dark ? "border-cream-200/10" : "border-cream-300"
            }`}
            key={tile.name}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={`font-display text-[15px] font-semibold tracking-[.04em] ${
                  dark ? "text-cream-100" : "text-ink-900"
                }`}
              >
                {tile.name}
              </span>
              <span className="flex items-baseline gap-2">
                {tile.delta && (
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      tile.delta.dir === "down"
                        ? dark
                          ? "text-rust-500"
                          : "text-rust-600"
                        : tile.delta.dir === "up"
                          ? dark
                            ? "text-vision-500"
                            : "text-vision-700"
                          : dark
                            ? "text-sage-400"
                            : "text-ink-600"
                    }`}
                  >
                    {tile.delta.text}
                  </span>
                )}
                <span
                  className={`font-mono text-xl leading-none font-semibold tabular-nums ${scoreColor(
                    tile.score,
                    dark,
                  )}`}
                >
                  {tile.score}
                </span>
              </span>
            </div>
            <div
              className={`mt-2 overflow-hidden rounded-sm ${
                dark ? "h-2 bg-black/30" : "h-2.5 bg-cream-300"
              }`}
              aria-hidden
            >
              <div
                className={`h-full rounded-sm ${barFill(tile.score, dark)}`}
                style={{ width: `${Math.max(8, Math.min(100, tile.score))}%` }}
              />
            </div>
            <p
              className={`mt-1.5 text-[12.5px] leading-[1.5] ${
                dark ? "text-cream-200" : "text-ink-900"
              }`}
            >
              {tile.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

type ChartColumn = { value: number; isToday: boolean };

/**
 * Always six columns so the trail matches the mock. Missing history fills
 * backwards from today in small steps — the card looks finished even on
 * a first upload.
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
}: {
  history: ConsistencyPoint[];
  today: number;
  tone: Tone;
}) {
  const dark = tone === "dark";
  const columns = sixColumns(history, today);
  const oldestReal = history.length ? history[Math.max(0, history.length - 5)].date : null;

  return (
    <div className={`border-b py-4 ${dark ? "border-cream-200/15" : "border-cream-300"}`}>
      <Kicker tone={tone}>Last 6 sessions</Kicker>
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
        <span>{oldestReal ? relativeTime(oldestReal) : "6 weeks ago"}</span>
        <span className={dark ? "text-gold-500" : "text-gold-600"}>today</span>
      </div>
      <p className={`mt-2 text-[11px] ${dark ? "text-sage-400" : "text-ink-600"}`}>
        Score per session — how the technique has been tracking.
      </p>
    </div>
  );
}

/**
 * Peach/rust "fix this one thing" card. `nextScore` is the mock's payoff
 * line ("practice, and your score becomes 88").
 */
export function FocusBlock({
  focus,
  tone,
  nextScore,
}: {
  focus: FocusArea;
  tone: Tone;
  nextScore?: number;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={`my-4 rounded-[10px] px-4 pt-3.5 pb-4 ${
        dark
          ? "border border-rust-500/40 bg-rust-500/10"
          : "border border-rust-600/20 bg-[#f6e6dc]"
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
          dark ? "bg-black/30" : "border border-dashed border-cream-400 bg-white"
        }`}
      >
        <div
          className={`font-mono text-[10px] font-semibold tracking-[.2em] uppercase ${
            dark ? "text-sage-400" : "text-ink-600"
          }`}
        >
          Try this
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
        {nextScore != null
          ? `→ Practice, and your score becomes ${nextScore}.`
          : `→ Upload your next video — we re-measure ${focus.remeasure} and tell you if it’s fixed.`}
      </p>
    </div>
  );
}

/** Mock footer: green tick + coach sign-off. */
export function CoachStamp({ tone }: { tone: Tone }) {
  const dark = tone === "dark";
  return (
    <div className="flex items-start gap-3 py-4">
      <span
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-sm ${
          dark ? "bg-vision-500/20 text-vision-300" : "bg-vision-700/15 text-vision-700"
        }`}
      >
        ✓
      </span>
      <div>
        <div
          className={`font-display text-[13px] font-semibold tracking-[.06em] uppercase ${
            dark ? "text-cream-100" : "text-ink-900"
          }`}
        >
          This report is approved by an ECB Level 3 coach
        </div>
        <p
          className={`mt-1.5 text-[12.5px] leading-[1.55] italic ${
            dark ? "text-sage-400" : "text-ink-600"
          }`}
        >
          &ldquo;Genuinely repeatable technique. Lock in the one thing above and the rest
          holds.&rdquo;
        </p>
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

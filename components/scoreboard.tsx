import { Kicker } from "@/components/ui";
import type { FocusArea } from "@/lib/report-measurements";
import { changeKind, type ReportScores, type ScoreTile, type Verdict } from "@/lib/report-scores";

/**
 * The scoreboard block of a live report — the same object the landing page's
 * report card draws (components/landing/report-variants/variant-scoreboard),
 * fed by lib/report-scores.ts instead of staged numbers, and set in the
 * product register rather than the landing one (STYLE-GUIDE.md): score bars
 * are amber because they are measured data, and fill maroon below 60 like
 * every other meter; a change is two words of text, not a pill; the verdict
 * word is the one place moss appears. Server-rendered and static.
 *
 * Two deliberate differences from the mock. No elite tick on the bars: the
 * mark at 95 was a placeholder, the product has no elite reference to put
 * there until the NextXI pro reference set exists (docs/BENCHMARKS.md), and a
 * tick with nothing behind it is exactly the invented target the rest of the
 * report refuses to draw. And no dial: the report shell's headline figure
 * already carries the session number.
 */

export const VERDICT_WORDS: Record<Verdict, string> = {
  great: "Great session",
  good: "Good session",
  solid: "Solid session",
  keep: "Keep building",
};

/** The Measured Rule: colour passes judgment below 60 and nowhere else. */
const LOW = 60;

/** "▲ 6 on last session" — a sentence in the change's colour, not a pill. */
function SessionChange({ now, previous }: { now: number; previous: number }) {
  const delta = now - previous;
  const kind = changeKind(delta);
  if (kind === "same") {
    return <span className="text-ui text-ink-600">About the same as last time</span>;
  }
  return (
    <span className={`text-ui font-semibold ${kind === "up" ? "text-moss-600" : "text-rust-600"}`}>
      {kind === "up" ? "▲" : "▼"} {Math.abs(delta)} on last session
    </span>
  );
}

function DeltaMark({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const kind = changeKind(delta);
  if (kind === "same") {
    return <span className="text-caption text-ink-600">same</span>;
  }
  return (
    <span className={`text-caption font-semibold ${kind === "up" ? "text-moss-600" : "text-rust-600"}`}>
      {kind === "up" ? "▲" : "▼"} {Math.abs(delta)}
    </span>
  );
}

/** Bolds the verdict word — the note's first sentence. */
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

function TileRow({ tile }: { tile: ScoreTile }) {
  const low = tile.score < LOW;
  return (
    <div className="border-b border-cream-400 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body font-semibold text-ink-900">{tile.name}</span>
        <span className="flex items-baseline gap-2.5">
          <DeltaMark delta={tile.delta} />
          <span className={`text-figure-sm font-semibold tabular-nums ${low ? "text-rust-600" : ""}`}>
            {tile.score}
          </span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-sm bg-cream-250" aria-hidden>
        <div
          className={`h-full rounded-sm ${low ? "bg-rust-600" : "bg-amber-500"}`}
          style={{ width: `${Math.max(0, Math.min(100, tile.score))}%` }}
        />
      </div>
      <p className="mt-1.5 text-caption text-ink-800">
        <TileNote note={tile.note} />
      </p>
    </div>
  );
}

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The session trail — only once there is a trail (two or more occasions). */
function SessionsChart({ history }: { history: ReportScores["history"] }) {
  if (history.length < 2) return null;
  return (
    <div className="border-b border-cream-400 py-4">
      <Kicker>Last {history.length} sessions</Kicker>
      <div className="mt-3 flex items-end gap-1.5" aria-hidden>
        {history.map((point, index) => {
          const today = index === history.length - 1;
          return (
            <div className="flex-1" key={point.date.toISOString()}>
              <div
                className={`text-center text-caption font-semibold tabular-nums ${
                  today ? "text-amber-500" : "text-ink-600"
                }`}
              >
                {point.score}
              </div>
              <div
                className={`mt-1 rounded-t-sm ${today ? "bg-amber-500" : "bg-cream-350"}`}
                style={{ height: `${Math.max(6, (point.score / 100) * 56)}px` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-caption text-ink-600">
        <span>{shortDate(history[0].date)}</span>
        <span className="text-amber-500">today</span>
      </div>
    </div>
  );
}

/** "Fix this one thing" — a kicker, the thing, and the drill as the info flash. */
function FixBlock({ focus }: { focus: FocusArea }) {
  return (
    <div className="border-b border-cream-400 pt-4 pb-4">
      <Kicker>Fix this one thing</Kicker>
      <div className="mt-2 text-title font-bold text-ink-900">{focus.title}</div>
      <p className="mt-1 text-body text-ink-800">{focus.detail}</p>
      <p className="mt-3 border-l-2 border-rust-500 bg-rust-50 px-3 py-2 text-ui text-ink-800">
        <span className="font-semibold text-ink-900">Your drill · </span>
        {focus.drill}
      </p>
    </div>
  );
}

export function Scoreboard({
  scores,
  focus,
  consistency,
}: {
  scores: ReportScores;
  focus: FocusArea | null;
  /** Headline repeatability across the clip's shots; shown only with more than one shot. */
  consistency: number | null;
}) {
  const shots = scores.tiles[0]?.total ?? 0;
  const count = scores.tiles.length;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-cream-400 pb-4">
        {scores.previousScore === null ? (
          <span className="text-ui text-ink-600">
            First analysis — your change appears from the next session.
          </span>
        ) : (
          <SessionChange now={scores.score} previous={scores.previousScore} />
        )}
        {consistency !== null && shots > 1 ? (
          <span className="text-ui text-ink-600">
            <span className="font-semibold text-ink-900 tabular-nums">{consistency}%</span> consistency
            across {shots} balls
          </span>
        ) : null}
      </div>

      <div className="pt-4">
        <Kicker>{count === 1 ? "Your score" : `Your ${count} scores`}</Kicker>
      </div>
      <div className="mt-1">
        {scores.tiles.map((tile) => (
          <TileRow key={tile.key} tile={tile} />
        ))}
      </div>
      {scores.tiles.some((tile) => tile.banded) ? (
        <p className="mt-2 text-caption text-ink-600">
          Where a score is read from the ball-by-ball verdicts rather than measured, it sits in
          the middle of its band.
        </p>
      ) : null}

      <SessionsChart history={scores.history} />
      {focus ? <FixBlock focus={focus} /> : null}
    </div>
  );
}

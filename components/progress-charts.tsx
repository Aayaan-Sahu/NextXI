import { EmptyState, SectionHead, Stat } from "@/components/ui";
import type { StatEntryItem } from "@/lib/progress";

// ---- shared chart geometry -------------------------------------------------

const CHART_HEIGHT = 190;
const VISIBLE_INNINGS = 8;

const LINE_VIEW = { width: 540, height: 150, padX: 20, padY: 20, innerH: 110 };

function shortDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  });
}

/** "4 May" for the first bar of a month, then bare day numbers after it. */
function axisLabel(date: Date, previous: Date | null) {
  const day = date.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" });
  const sameMonth = previous !== null && previous.getUTCMonth() === date.getUTCMonth();
  if (sameMonth) return day;
  return `${day} ${date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}`;
}

type Point = { date: Date; value: number };

// ---- data derivation -------------------------------------------------------

const NOT_OUT = new Set([
  "not out",
  "notout",
  "not-out",
  "no",
  "dnb",
  "did not bat",
  "retired not out",
  "retired hurt",
  "retired",
]);

/** A batting innings counts against the average unless marked not out. */
function isOut(dismissal: string | null) {
  if (!dismissal) return true;
  return !NOT_OUT.has(dismissal.trim().toLowerCase());
}

/** Converts `.1`–`.5` overs notation into a real over count (balls / 6). */
function oversToRealOvers(overs: number) {
  const whole = Math.floor(overs + 1e-9);
  const balls = Math.round((overs - whole) * 10);
  return whole + balls / 6;
}

export type SeasonTotals = {
  runs: Point[];
  totalRuns: number;
  battingAverage: number | null;
  wickets: number;
  economy: number | null;
};

/**
 * The season read in one pass: the runs series the chart draws, plus the four
 * figures the header row reports. Averages stay null until they can be
 * computed honestly — a player with no completed innings has no average.
 */
export function deriveSeason(entries: StatEntryItem[]): SeasonTotals {
  const chrono = [...entries].reverse();

  const runs: Point[] = [];
  let totalRuns = 0;
  let outs = 0;
  let wickets = 0;
  let conceded = 0;
  let overs = 0;

  for (const entry of chrono) {
    if (entry.runs !== null) {
      runs.push({ date: entry.matchDate, value: entry.runs });
      totalRuns += entry.runs;
      if (isOut(entry.dismissal)) outs += 1;
    }
    if (entry.wickets !== null) wickets += entry.wickets;
    if (entry.oversBowled !== null && entry.oversBowled > 0 && entry.runsConceded !== null) {
      conceded += entry.runsConceded;
      overs += oversToRealOvers(entry.oversBowled);
    }
  }

  return {
    runs,
    totalRuns,
    battingAverage: outs > 0 ? totalRuns / outs : null,
    wickets,
    economy: overs > 0 ? conceded / overs : null,
  };
}

// ---- public components -----------------------------------------------------

/** The four season figures that open the page. */
export function SeasonStats({ season }: { season: SeasonTotals }) {
  return (
    <div className="flex flex-wrap gap-x-14 gap-y-5">
      <Stat caption="Runs this season" size="lg" value={season.totalRuns} />
      <Stat
        caption="Batting average"
        size="lg"
        value={season.battingAverage === null ? "—" : season.battingAverage.toFixed(1)}
      />
      <Stat caption="Wickets" size="lg" value={season.wickets} />
      <Stat
        caption="Economy"
        size="lg"
        value={season.economy === null ? "—" : season.economy.toFixed(1)}
      />
    </div>
  );
}

/**
 * The one chart that matters: runs per innings with the season average drawn
 * across it, so a score reads as above or below form at a glance.
 */
export function ProgressCharts({ entries }: { entries: StatEntryItem[] }) {
  const season = deriveSeason(entries);
  const data = season.runs.slice(-VISIBLE_INNINGS);

  if (!data.length) {
    return (
      <section>
        <SectionHead>Runs per innings</SectionHead>
        <div className="mt-4">
          <EmptyState>
            No batting logged yet.
          </EmptyState>
        </div>
      </section>
    );
  }

  const maxValue = Math.max(1, ...data.map((point) => point.value));
  const average = season.battingAverage;
  // The average line only makes sense inside the plotted range.
  const averageOffset =
    average === null || average > maxValue ? null : (1 - average / maxValue) * CHART_HEIGHT;

  return (
    <section>
      <SectionHead
        aside={
          <span className="text-caption text-ink-600">
            Last {data.length}
            {average === null ? "" : ` · season average ${average.toFixed(1)}`}
          </span>
        }
      >
        Runs per innings
      </SectionHead>

      <div
        aria-label="Runs per innings"
        className="relative mt-5 border-b border-cream-400"
        role="img"
        style={{ height: CHART_HEIGHT }}
      >
        {averageOffset === null ? null : (
          <>
            <div
              aria-hidden
              className="absolute inset-x-0 border-t border-dashed border-cream-500"
              style={{ top: averageOffset }}
            />
            <span
              aria-hidden
              className="absolute right-0 bg-cream-200 px-1 text-caption text-ink-600"
              style={{ top: Math.max(0, averageOffset - 13) }}
            >
              avg {average?.toFixed(1)}
            </span>
          </>
        )}
        <div className="flex h-full items-end gap-3 sm:gap-6">
          {data.map((point, index) => (
            <div className="flex flex-1 flex-col items-center gap-1.5" key={index}>
              <span className="text-caption text-ink-800 tabular-nums">{point.value}</span>
              <div
                className="w-full max-w-[34px] rounded-t-[3px] bg-amber-500"
                style={{
                  height: `${Math.max((point.value / maxValue) * (CHART_HEIGHT - 22), 3)}px`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-3 sm:gap-6">
        {data.map((point, index) => (
          <span className="flex-1 text-center text-caption text-ink-600" key={index}>
            {axisLabel(point.date, index > 0 ? data[index - 1].date : null)}
          </span>
        ))}
      </div>
    </section>
  );
}

/**
 * The one line-chart primitive, drawn on by the technique-trends section.
 * `decimals` sets the precision of the first/last readouts (match stats read
 * fine at 1; normalized technique fractions need 2).
 */
export function LineChart({
  title,
  data,
  empty,
  decimals = 1,
}: {
  title: string;
  data: Point[];
  empty: string;
  decimals?: number;
}) {
  if (!data.length) {
    return (
      <div>
        <p className="text-ui font-semibold text-ink-900">{title}</p>
        <p className="mt-2 text-caption text-ink-600">{empty}</p>
      </div>
    );
  }

  const count = data.length;
  const innerW = LINE_VIEW.width - LINE_VIEW.padX * 2;

  const values = data.map((d) => d.value);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) {
    lo = Math.max(0, lo - 1);
    hi = hi + 1;
  } else {
    const margin = (hi - lo) * 0.15;
    lo = Math.max(0, lo - margin);
    hi = hi + margin;
  }

  const x = (i: number) =>
    count === 1 ? LINE_VIEW.width / 2 : LINE_VIEW.padX + innerW * (i / (count - 1));
  const y = (value: number) =>
    LINE_VIEW.padY + LINE_VIEW.innerH * (1 - (value - lo) / (hi - lo));

  const path = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const first = data[0];
  const last = data[count - 1];

  return (
    <div>
      <p className="text-ui font-semibold text-ink-900">{title}</p>
      <svg
        aria-label={title}
        className="mt-3 block h-[120px] w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${LINE_VIEW.width} ${LINE_VIEW.height}`}
      >
        {count > 1 ? (
          <polyline
            className="fill-none stroke-ink-900"
            points={path}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        ) : null}
        {data.map((d, i) => (
          <circle className="fill-amber-500" cx={x(i)} cy={y(d.value)} key={i} r={4} />
        ))}
      </svg>
      <div className="mt-1.5 flex justify-between text-caption text-ink-600 tabular-nums">
        <span>
          {first.value.toFixed(decimals)} · {shortDate(first.date)}
        </span>
        {count > 1 ? (
          <span>
            {last.value.toFixed(decimals)} · {shortDate(last.date)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

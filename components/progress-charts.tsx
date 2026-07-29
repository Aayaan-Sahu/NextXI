import type { ReactNode } from "react";
import { Kicker, Panel } from "@/components/ui";
import type { StatEntryItem } from "@/lib/progress";

// ---- shared chart geometry -------------------------------------------------

const MAX_BAR_HEIGHT = 112;

const LINE_VIEW = { width: 540, height: 150, padX: 20, padY: 20, innerH: 110 };

function shortDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  });
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

type Derived = {
  runs: Point[];
  wickets: Point[];
  battingAverage: Point[];
  economy: Point[];
};

function derive(entries: StatEntryItem[]): Derived {
  const chrono = [...entries].reverse();

  const runs: Point[] = [];
  const wickets: Point[] = [];
  const battingAverage: Point[] = [];
  const economy: Point[] = [];

  let cumRuns = 0;
  let cumOuts = 0;
  let cumConceded = 0;
  let cumOvers = 0;

  for (const entry of chrono) {
    if (entry.runs !== null) {
      runs.push({ date: entry.matchDate, value: entry.runs });
      cumRuns += entry.runs;
      if (isOut(entry.dismissal)) cumOuts += 1;
      if (cumOuts > 0) {
        battingAverage.push({ date: entry.matchDate, value: cumRuns / cumOuts });
      }
    }

    if (entry.wickets !== null) {
      wickets.push({ date: entry.matchDate, value: entry.wickets });
    }

    if (entry.oversBowled !== null && entry.oversBowled > 0 && entry.runsConceded !== null) {
      cumConceded += entry.runsConceded;
      cumOvers += oversToRealOvers(entry.oversBowled);
      if (cumOvers > 0) {
        economy.push({ date: entry.matchDate, value: cumConceded / cumOvers });
      }
    }
  }

  return { runs, wickets, battingAverage, economy };
}

// ---- chart primitives ------------------------------------------------------

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel>
      <Kicker>{title}</Kicker>
      {children}
    </Panel>
  );
}

function ChartEmpty({ children }: { children: string }) {
  return <p className="py-10 text-center text-sm text-ink-600">{children}</p>;
}

function BarChart({
  title,
  data,
  empty,
}: {
  title: string;
  data: Point[];
  empty: string;
}) {
  if (!data.length) {
    return (
      <ChartCard title={title}>
        <ChartEmpty>{empty}</ChartEmpty>
      </ChartCard>
    );
  }

  const maxValue = Math.max(1, ...data.map((d) => d.value));

  return (
    <ChartCard title={title}>
      <div
        aria-label={title}
        className="mt-[18px] flex h-[150px] items-end gap-[18px] overflow-x-auto px-1.5"
        role="img"
      >
        {data.map((d, i) => (
          <div className="flex shrink-0 flex-col items-center gap-[5px]" key={i}>
            <span className="font-mono text-[10px] text-ink-600">{d.value}</span>
            <div
              className="w-6 rounded-t-[3px] bg-gold-500"
              style={{ height: `${Math.max((d.value / maxValue) * MAX_BAR_HEIGHT, 3)}px` }}
            />
            <span className="font-mono text-[10px] text-sage-400">{shortDate(d.date)}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

/**
 * Shared date-series line chart card. Also drawn on by the technique-trends
 * section, so it lives here as the one line-chart primitive. `decimals` sets
 * the precision of the first/last readouts (match stats read fine at 1;
 * normalized technique fractions need 2).
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
      <ChartCard title={title}>
        <ChartEmpty>{empty}</ChartEmpty>
      </ChartCard>
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
    count === 1
      ? LINE_VIEW.width / 2
      : LINE_VIEW.padX + innerW * (i / (count - 1));
  const y = (value: number) =>
    LINE_VIEW.padY + LINE_VIEW.innerH * (1 - (value - lo) / (hi - lo));

  const path = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const first = data[0];
  const last = data[count - 1];

  return (
    <ChartCard title={title}>
      <svg
        aria-label={title}
        className="mt-[18px] block h-[150px] w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${LINE_VIEW.width} ${LINE_VIEW.height}`}
      >
        {count > 1 ? (
          <polyline
            className="fill-none stroke-pitch-900"
            points={path}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        ) : null}
        {data.map((d, i) => (
          <circle className="fill-gold-500" cx={x(i)} cy={y(d.value)} key={i} r={4} />
        ))}
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[10.5px] text-ink-600">
        <span>
          {first.value.toFixed(decimals)} · {shortDate(first.date)}
        </span>
        {count > 1 ? (
          <span>
            {last.value.toFixed(decimals)} · {shortDate(last.date)}
          </span>
        ) : null}
      </div>
    </ChartCard>
  );
}

// ---- public component ------------------------------------------------------

export function ProgressCharts({ entries }: { entries: StatEntryItem[] }) {
  if (!entries.length) {
    return (
      <Panel>
        <Kicker>Trends</Kicker>
        <div className="mt-4 rounded-md border border-dashed border-cream-500 bg-cream-50 py-10 text-center">
          <p className="text-sm font-semibold text-ink-900">No stats yet</p>
          <p className="mt-1 text-sm text-ink-600">
            Log your first match below and your batting and bowling trends will
            appear here.
          </p>
        </div>
      </Panel>
    );
  }

  const { runs, wickets, battingAverage, economy } = derive(entries);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <BarChart data={runs} empty="No batting logged yet." title="Runs per match" />
      <BarChart data={wickets} empty="No bowling logged yet." title="Wickets per match" />
      <LineChart
        data={battingAverage}
        empty="Log a completed innings to track your average."
        title="Batting average"
      />
      <LineChart
        data={economy}
        empty="Log some overs to track your economy."
        title="Bowling economy"
      />
    </div>
  );
}

import type { ReactNode } from "react";
import { Panel } from "@/components/ui";
import type { StatEntryItem } from "@/lib/progress";

// ---- shared chart geometry -------------------------------------------------

const HEIGHT = 180;
const PAD = { top: 16, right: 12, bottom: 28, left: 34 };

function chartWidth(count: number) {
  return Math.max(count * 48, 320);
}

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
    <section className="grid gap-2 rounded-md border border-stone-200 p-4">
      <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
      {children}
    </section>
  );
}

function ChartEmpty({ children }: { children: string }) {
  return <p className="py-6 text-center text-sm text-stone-500">{children}</p>;
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

  const count = data.length;
  const width = chartWidth(count);
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const slot = innerW / count;
  const barW = Math.min(slot * 0.6, 40);
  const baseline = PAD.top + innerH;

  return (
    <ChartCard title={title}>
      <div className="overflow-x-auto">
        <svg height={HEIGHT} role="img" aria-label={title} width={width}>
          <line
            className="stroke-stone-200"
            x1={PAD.left}
            x2={width - PAD.right}
            y1={baseline}
            y2={baseline}
          />
          <text className="fill-stone-400 text-[10px]" x={0} y={PAD.top + 4}>
            {maxValue}
          </text>
          {data.map((d, i) => {
            const cx = PAD.left + slot * (i + 0.5);
            const barHeight = (d.value / maxValue) * innerH;
            const y = baseline - barHeight;
            return (
              <g key={i}>
                <rect
                  className="fill-emerald-600"
                  height={barHeight}
                  rx={2}
                  width={barW}
                  x={cx - barW / 2}
                  y={y}
                />
                {count <= 16 ? (
                  <text
                    className="fill-stone-600 text-[10px]"
                    textAnchor="middle"
                    x={cx}
                    y={y - 4}
                  >
                    {d.value}
                  </text>
                ) : null}
                {count <= 10 ? (
                  <text
                    className="fill-stone-400 text-[9px]"
                    textAnchor="middle"
                    x={cx}
                    y={HEIGHT - 8}
                  >
                    {shortDate(d.date)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </ChartCard>
  );
}

function LineChart({
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

  const count = data.length;
  const width = chartWidth(count);
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const baseline = PAD.top + innerH;

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
    count === 1 ? PAD.left + innerW / 2 : PAD.left + innerW * (i / (count - 1));
  const y = (value: number) => PAD.top + innerH * (1 - (value - lo) / (hi - lo));

  const path = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");

  return (
    <ChartCard title={title}>
      <div className="overflow-x-auto">
        <svg height={HEIGHT} role="img" aria-label={title} width={width}>
          <line
            className="stroke-stone-200"
            x1={PAD.left}
            x2={width - PAD.right}
            y1={baseline}
            y2={baseline}
          />
          <text className="fill-stone-400 text-[10px]" x={0} y={PAD.top + 4}>
            {hi.toFixed(1)}
          </text>
          {count > 1 ? (
            <polyline
              className="fill-none stroke-emerald-600"
              points={path}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          ) : null}
          {data.map((d, i) => (
            <g key={i}>
              <circle className="fill-emerald-600" cx={x(i)} cy={y(d.value)} r={3} />
              {i === 0 || i === count - 1 ? (
                <>
                  <text
                    className="fill-stone-600 text-[10px]"
                    textAnchor="middle"
                    x={x(i)}
                    y={y(d.value) - 8}
                  >
                    {d.value.toFixed(2)}
                  </text>
                  <text
                    className="fill-stone-400 text-[9px]"
                    textAnchor="middle"
                    x={x(i)}
                    y={HEIGHT - 8}
                  >
                    {shortDate(d.date)}
                  </text>
                </>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </ChartCard>
  );
}

// ---- public component ------------------------------------------------------

export function ProgressCharts({ entries }: { entries: StatEntryItem[] }) {
  if (!entries.length) {
    return (
      <Panel title="Trends">
        <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 py-10 text-center">
          <p className="text-sm font-medium text-neutral-950">No stats yet</p>
          <p className="mt-1 text-sm text-stone-600">
            Log your first match below and your batting and bowling trends will
            appear here.
          </p>
        </div>
      </Panel>
    );
  }

  const { runs, wickets, battingAverage, economy } = derive(entries);

  return (
    <Panel title="Trends">
      <div className="grid gap-4 md:grid-cols-2">
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
    </Panel>
  );
}

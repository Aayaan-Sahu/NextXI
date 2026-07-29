import { LineChart } from "@/components/progress-charts";
import { Kicker, Panel } from "@/components/ui";
import {
  MIN_SESSIONS_FOR_TRENDS,
  type MetricTrend,
  type TechniqueTrendData,
  type TrendPoint,
} from "@/lib/metric-trends";

/**
 * Cross-session technique trends: one line chart per AI-measured metric, a
 * point per practice session. Renders only metrics measured in enough sessions;
 * below that, a single-sentence prompt in place of the grid.
 */

/** Precision that keeps small normalized fractions legible and degrees terse. */
function decimalsFor(points: TrendPoint[]): number {
  const maxAbs = Math.max(...points.map((point) => Math.abs(point.value)));
  return maxAbs >= 100 ? 0 : maxAbs >= 10 ? 1 : 2;
}

export function TechniqueTrends({ trends }: { trends: TechniqueTrendData }) {
  const groups: { name: string; series: MetricTrend[] }[] = [
    { name: "Batting", series: trends.batting },
    { name: "Bowling", series: trends.bowling },
  ].filter((group) => group.series.length > 0);

  if (groups.length === 0) {
    return (
      <Panel>
        <Kicker>Technique trends</Kicker>
        <p className="mt-4 text-sm text-ink-600">
          {trends.analysedSessionCount < MIN_SESSIONS_FOR_TRENDS
            ? `Analyse videos in at least ${MIN_SESSIONS_FOR_TRENDS} practice sessions and your technique trends will appear here.`
            : "Your analysed sessions don’t share a comparable measurement yet — trends appear once the same metric is measured in two sessions."}
        </p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-5 md:grid-cols-2">
        {groups.flatMap((group) =>
          group.series.map((metric) => (
            <LineChart
              data={metric.points}
              decimals={decimalsFor(metric.points)}
              empty="Not enough analysed sessions yet."
              key={`${group.name}-${metric.label}`}
              title={`${group.name} · ${metric.label}`}
            />
          )),
        )}
      </div>
      <p className="text-[11px] text-ink-600">
        Each point is one practice session’s median across its analysed videos.
      </p>
    </div>
  );
}

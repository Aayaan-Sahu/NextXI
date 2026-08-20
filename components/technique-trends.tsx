import { LineChart } from "@/components/progress-charts";
import { SectionHeading } from "@/components/ui";
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
      <section>
        <SectionHeading>Technique trend</SectionHeading>
        <p className="mt-3.5 text-ui leading-relaxed text-ink-800">
          {trends.analysedSessionCount < MIN_SESSIONS_FOR_TRENDS
            ? `Analyse videos in at least ${MIN_SESSIONS_FOR_TRENDS} practice sessions and your technique trends will appear here.`
            : "Your analysed sessions don’t share a comparable measurement yet — trends appear once the same metric is measured in two sessions."}
        </p>
      </section>
    );
  }

  return (
    <section>
      <SectionHeading>Technique trend</SectionHeading>
      <div className="mt-3.5 grid gap-5">
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
      <p className="mt-3.5 text-caption leading-relaxed text-ink-600">
        Each point is one practice session’s median across its analysed videos.
      </p>
    </section>
  );
}

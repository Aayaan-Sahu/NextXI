import { MeasurementsIntro, ReportMetricRow } from "@/components/report-metric";
import { Kicker } from "@/components/ui";
import { CONSISTENCY, METRICS, SHOTS_ANALYSED, SUBTITLE, SUMMARY } from "./report-data";
import { ReportTrailer } from "./report-shared";

/** Variant A — "Scoreboard": dense dark scanline list, one row per metric with
    the measured value, its reference range and the read. Numbers-first, closest
    to a broadcast stats panel. */
export function VariantScoreboard() {
  return (
    <div className="rounded-[10px] bg-thumb-scanlines px-6 pt-6 pb-4 text-cream-200 sm:px-7">
      <div className="flex items-end justify-between gap-4 border-b border-cream-200/15 pb-4">
        <div className="min-w-0">
          <Kicker tone="dark">Coaching report</Kicker>
          <div className="mt-2 text-caption text-cream-200/70">{SUBTITLE}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-figure font-semibold tabular-nums text-cream-50">
            {CONSISTENCY}
            <span className="text-figure-sm">%</span>
          </div>
          <div className="mt-1 whitespace-nowrap text-caption text-cream-200/70">
            Consistency · {SHOTS_ANALYSED} balls
          </div>
        </div>
      </div>

      <p className="border-b border-cream-200/15 py-4 text-body text-cream-100">{SUMMARY}</p>

      <div className="pt-4">
        <MeasurementsIntro tone="dark" />
      </div>
      {METRICS.map((metric) => (
        <ReportMetricRow key={metric.name} metric={metric} tone="dark" />
      ))}

      <ReportTrailer tone="dark" />
    </div>
  );
}

import { MeasuredMetricRow } from "@/components/measured-metric";
import { Kicker } from "@/components/ui";
import { CONSISTENCY, METRICS, SHOTS_ANALYSED, SUBTITLE, SUMMARY } from "./report-data";
import { ReportTrailer } from "./report-shared";

/** Variant A — "Scoreboard": dense dark scanline list, one row per metric with
    the measured value, its reference range and the read. Numbers-first, closest
    to a broadcast stats panel. */
export function VariantScoreboard() {
  return (
    <div className="rounded-[12px] bg-pitch-800 bg-[repeating-linear-gradient(0deg,transparent_0_44px,rgba(0,0,0,.10)_44px_46px)] px-6 pt-6 pb-4 text-cream-200 shadow-2xl shadow-black/45 sm:px-7">
      <div className="flex items-end justify-between gap-4 border-b border-cream-200/15 pb-4">
        <div>
          <Kicker tone="dark">Coaching report</Kicker>
          <div className="mt-2 font-mono text-[11px] text-sage-400">{SUBTITLE}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[44px] leading-none font-semibold text-gold-500">
            {CONSISTENCY}
            <span className="text-2xl">%</span>
          </div>
          <div className="mt-0.5 font-display text-[10.5px] tracking-[.18em] text-sage-400 uppercase">
            Consistency · {SHOTS_ANALYSED} balls
          </div>
        </div>
      </div>

      <p className="border-b border-cream-200/15 py-4 text-[13.5px] leading-[1.6] text-cream-100">
        {SUMMARY}
      </p>

      <div className="pt-3">
        <Kicker tone="dark">Measurements</Kicker>
      </div>
      {METRICS.map((metric) => (
        <MeasuredMetricRow key={metric.name} metric={metric} tone="dark" />
      ))}

      <ReportTrailer tone="dark" />
    </div>
  );
}

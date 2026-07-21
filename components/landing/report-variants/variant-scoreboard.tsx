import { Kicker } from "@/components/ui";
import { MEASUREMENTS, METRICS, OVERALL, SUBTITLE, SUMMARY, type Metric } from "./report-data";
import { DeltaChip, ReportTrailer } from "./report-shared";

function MetricRow({ metric }: { metric: Metric }) {
  const low = metric.score < 80;
  return (
    <div className="border-b border-cream-200/15 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-sm tracking-[.08em] text-cream-100 uppercase">
          {metric.name}
        </span>
        <span className="flex items-baseline gap-2">
          <DeltaChip delta={metric.delta} tone="dark" />
          <span
            className={`font-mono text-lg font-semibold ${low ? "text-rust-500" : "text-gold-500"}`}
          >
            {metric.score}
          </span>
        </span>
      </div>
      <div className="relative mt-2 h-[5px] rounded-sm bg-black/30">
        <div
          className={`h-full rounded-sm ${low ? "bg-rust-500" : "bg-gold-500"}`}
          style={{ width: `${metric.score}%` }}
        />
        <span
          className="absolute top-[-2px] h-[9px] w-px bg-cream-100"
          style={{ left: `${metric.elite}%` }}
          title={`Elite benchmark ${metric.elite}`}
        />
      </div>
      <div className="mt-1 font-mono text-[10.5px] tracking-[.1em] text-sage-400">
        vs elite {metric.elite}
      </div>
    </div>
  );
}

/** Variant A — "Scoreboard": dense dark scanline list, one row per metric with
    a bar + elite tick + session delta. Numbers-first, closest to a broadcast
    stats panel. */
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
            {OVERALL}
          </div>
          <div className="mt-0.5 font-display text-[11px] tracking-[.22em] text-sage-400 uppercase">
            Overall / 100
          </div>
        </div>
      </div>

      <p className="border-b border-cream-200/15 py-4 text-[13.5px] leading-[1.6] text-cream-100">
        {SUMMARY}
      </p>

      <div className="pt-3">
        <Kicker tone="dark">Metrics vs elite benchmark</Kicker>
      </div>
      {METRICS.map((metric) => (
        <MetricRow key={metric.name} metric={metric} />
      ))}

      <div className="flex justify-between gap-2 border-b border-cream-200/15 py-3.5">
        {MEASUREMENTS.map((m) => (
          <div key={m.label} className="text-center">
            <div className="font-mono text-[15px] font-semibold text-vision-300 tabular-nums">
              {m.value}
            </div>
            <div className="mt-1 text-[9.5px] tracking-[.14em] text-sage-400 uppercase">{m.label}</div>
            <div className="font-mono text-[9.5px] text-sage-400/70">elite {m.elite}</div>
          </div>
        ))}
      </div>

      <ReportTrailer tone="dark" />
    </div>
  );
}

import { Kicker } from "@/components/ui";
import {
  CONSISTENCY,
  CONSISTENCY_BY_METRIC,
  METRICS,
  SHOTS_ANALYSED,
  SUBTITLE,
  SUMMARY,
} from "./report-data";
import { ReportTrailer } from "./report-shared";

const CX = 100;
const CY = 95;
const MAX_R = 58;
const N = METRICS.length;
/** Below this a metric reads as the session's loose element. */
const LOW_CONSISTENCY = 80;

function point(valuePct: number, i: number, radius = MAX_R) {
  const angle = ((-90 + (i * 360) / N) * Math.PI) / 180;
  const r = (valuePct / 100) * radius;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)] as const;
}

function polygon(values: number[]) {
  return values.map((v, i) => point(v, i).join(",")).join(" ");
}

const consistencyOf = (short: string) => CONSISTENCY_BY_METRIC[short] ?? 0;
const youPts = polygon(METRICS.map((m) => consistencyOf(m.short)));

/** Variant B — "Radar": leads with a spider chart of how repeatable each part
    of the technique was across the session, so the loose element reads in one
    glance, then a numeric legend backs it up.

    It plots consistency rather than "you vs elite" deliberately: consistency is
    computed from the shot-to-shot coefficient of variation, so every spoke is a
    real measurement of the player against themselves. There is no published
    elite distribution for these metrics to plot a second polygon against, and
    inventing one is exactly what this report is designed not to do. */
export function VariantRadar() {
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

      <p className="py-4 text-[13.5px] leading-[1.6] text-cream-100">{SUMMARY}</p>

      <div className="pb-1">
        <Kicker tone="dark">Repeatability across {SHOTS_ANALYSED} balls</Kicker>
      </div>

      {/* radar */}
      <div className="flex justify-center">
        <svg viewBox="0 0 200 195" className="w-full max-w-[320px]">
          {/* grid rings */}
          {[25, 50, 75, 100].map((pct) => (
            <polygon
              key={pct}
              points={polygon(METRICS.map(() => pct))}
              fill="none"
              stroke="rgba(239,234,217,0.12)"
              strokeWidth={0.6}
            />
          ))}
          {/* spokes + labels */}
          {METRICS.map((m, i) => {
            const [ax, ay] = point(100, i);
            const [lx, ly] = point(122, i);
            const anchor = lx > CX + 4 ? "start" : lx < CX - 4 ? "end" : "middle";
            return (
              <g key={m.name}>
                <line x1={CX} y1={CY} x2={ax} y2={ay} stroke="rgba(239,234,217,0.12)" strokeWidth={0.6} />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  className="fill-sage-400 font-mono"
                  style={{ fontSize: 7, letterSpacing: 0.5 }}
                >
                  {m.short.toUpperCase()}
                </text>
              </g>
            );
          })}
          <polygon points={youPts} fill="rgba(240,200,160,0.22)" stroke="#f0c8a0" strokeWidth={1.4} />
          {METRICS.map((m, i) => {
            const [x, y] = point(consistencyOf(m.short), i);
            return (
              <circle
                key={m.name}
                cx={x}
                cy={y}
                r={1.6}
                className={consistencyOf(m.short) < LOW_CONSISTENCY ? "fill-rust-500" : "fill-gold-500"}
              />
            );
          })}
        </svg>
      </div>

      {/* numeric backing — the measured value next to its repeatability */}
      <div className="border-t border-cream-200/15 pt-1">
        {METRICS.map((m) => {
          const consistency = consistencyOf(m.short);
          return (
            <div
              key={m.name}
              className="flex items-baseline justify-between gap-3 border-b border-cream-200/10 py-2 last:border-b-0"
            >
              <span className="text-[12.5px] text-cream-100">{m.name}</span>
              <span className="flex items-baseline gap-2.5 font-mono">
                <span className="text-[11px] text-sage-400 tabular-nums">
                  {m.value.toFixed(m.decimals)} {m.unit}
                </span>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    consistency < LOW_CONSISTENCY ? "text-rust-500" : "text-gold-500"
                  }`}
                >
                  {consistency}%
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="pt-4">
        <ReportTrailer tone="dark" />
      </div>
    </div>
  );
}

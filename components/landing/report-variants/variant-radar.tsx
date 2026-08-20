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

      <p className="py-4 text-body text-cream-100">{SUMMARY}</p>

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
              className="stroke-cream-200/12"
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
                <line x1={CX} y1={CY} x2={ax} y2={ay} className="stroke-cream-200/12" strokeWidth={0.6} />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  className="fill-cream-200/70"
                  style={{ fontSize: 7, letterSpacing: 0.5 }}
                >
                  {m.short.toUpperCase()}
                </text>
              </g>
            );
          })}
          {/* Amber is the measured value everywhere in the system, so the
              plotted polygon is amber — not the peach that means "act". */}
          <polygon
            points={youPts}
            className="fill-amber-500/20 stroke-amber-500"
            strokeWidth={1.4}
          />
          {METRICS.map((m, i) => {
            const [x, y] = point(consistencyOf(m.short), i);
            return (
              <circle
                key={m.name}
                cx={x}
                cy={y}
                r={1.6}
                className={
                  consistencyOf(m.short) < LOW_CONSISTENCY ? "fill-rust-500" : "fill-amber-500"
                }
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
              <span className="text-ui text-cream-100">{m.name}</span>
              <span className="flex items-baseline gap-2.5">
                <span className="text-caption tabular-nums text-cream-200/70">
                  {m.value.toFixed(m.decimals)} {m.unit}
                </span>
                <span
                  className={`text-ui font-semibold tabular-nums ${
                    consistency < LOW_CONSISTENCY ? "text-rust-500" : "text-amber-500"
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

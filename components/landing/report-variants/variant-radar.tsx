import { Kicker } from "@/components/ui";
import { METRICS, OVERALL, SUBTITLE, SUMMARY } from "./report-data";
import { DeltaChip, ReportTrailer } from "./report-shared";

const CX = 100;
const CY = 95;
const MAX_R = 58;
const N = METRICS.length;

function point(valuePct: number, i: number, radius = MAX_R) {
  const angle = ((-90 + (i * 360) / N) * Math.PI) / 180;
  const r = (valuePct / 100) * radius;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)] as const;
}

function polygon(values: number[]) {
  return values.map((v, i) => point(v, i).join(",")).join(" ");
}

const youPts = polygon(METRICS.map((m) => m.score));
const elitePts = polygon(METRICS.map((m) => m.elite));

/** Variant B — "Radar": leads with a spider chart of you (gold) against the
    elite benchmark (mint), so the whole comparison reads in one glance, then a
    compact numeric legend backs it up. */
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
            {OVERALL}
          </div>
          <div className="mt-0.5 font-display text-[11px] tracking-[.22em] text-sage-400 uppercase">
            Overall / 100
          </div>
        </div>
      </div>

      <p className="py-4 text-[13.5px] leading-[1.6] text-cream-100">{SUMMARY}</p>

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
          {/* elite benchmark */}
          <polygon points={elitePts} fill="none" stroke="#7ce8bf" strokeWidth={1} strokeDasharray="2 1.5" />
          {/* you */}
          <polygon points={youPts} fill="rgba(240,200,160,0.22)" stroke="#f0c8a0" strokeWidth={1.4} />
          {METRICS.map((m, i) => {
            const [x, y] = point(m.score, i);
            return <circle key={m.name} cx={x} cy={y} r={1.6} className="fill-gold-500" />;
          })}
        </svg>
      </div>

      {/* legend */}
      <div className="flex justify-center gap-5 pb-3 font-mono text-[10.5px] tracking-[.12em] text-sage-400 uppercase">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gold-500" /> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-3 border-t-2 border-dashed border-vision-500" /> Elite
        </span>
      </div>

      {/* numeric backing */}
      <div className="border-t border-cream-200/15 pt-1">
        {METRICS.map((m) => (
          <div
            key={m.name}
            className="flex items-baseline justify-between gap-3 border-b border-cream-200/10 py-2 last:border-b-0"
          >
            <span className="text-[12.5px] text-cream-100">{m.name}</span>
            <span className="flex items-baseline gap-2 font-mono">
              <span className="text-[10.5px] text-sage-400">elite {m.elite}</span>
              <DeltaChip delta={m.delta} tone="dark" />
              <span
                className={`text-sm font-semibold ${m.score < 80 ? "text-rust-500" : "text-gold-500"}`}
              >
                {m.score}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="pt-4">
        <ReportTrailer tone="dark" />
      </div>
    </div>
  );
}

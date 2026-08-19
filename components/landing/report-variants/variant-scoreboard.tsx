import { MeasuredMetricRow, MeasurementsIntro } from "@/components/measured-metric";
import {
  CoachStamp,
  FocusBlock,
  ReportHero,
  ScoreTiles,
  SessionsChart,
  nextScoreFor,
  type ScoreTile,
} from "@/components/report-scoreboard";
import { DRILL, METRICS, SHOTS_ANALYSED, WEAKEST } from "./report-data";

const DEMO_HISTORY = [
  { date: new Date(Date.now() - 42 * 86_400_000), value: 68 },
  { date: new Date(Date.now() - 35 * 86_400_000), value: 71 },
  { date: new Date(Date.now() - 21 * 86_400_000), value: 74 },
  { date: new Date(Date.now() - 14 * 86_400_000), value: 79 },
  { date: new Date(Date.now() - 7 * 86_400_000), value: 76 },
];

const DEMO_TILES: ScoreTile[] = [
  {
    name: "Front elbow",
    score: 91,
    note: "Very good. Elbow stays high — almost elite.",
    delta: { text: "▲ 4", dir: "up" },
  },
  {
    name: "Bat swing",
    score: 64,
    note: "Needs work. Bat comes down at an off-angle as you tire.",
    delta: { text: "▼ 3", dir: "down" },
  },
  {
    name: "Head movement",
    score: 88,
    note: "Very good. Head stays still through contact.",
    delta: { text: "▲ 2", dir: "up" },
  },
];

/** Variant A — the product scoreboard: dark hero, three score bars, range
    measurements, last-6 trail, one thing to fix. Same chrome as the live report. */
export function VariantScoreboard() {
  return (
    <div className="rounded-[12px] bg-pitch-800 bg-[repeating-linear-gradient(0deg,transparent_0_44px,rgba(0,0,0,.10)_44px_46px)] px-6 pt-6 pb-4 text-cream-200 shadow-2xl shadow-black/45 sm:px-7">
      <ReportHero
        balls={`${SHOTS_ANALYSED} balls analysed`}
        history={DEMO_HISTORY}
        score={82}
        tone="dark"
      />
      <ScoreTiles tiles={DEMO_TILES} tone="dark" />
      <div className="pt-4">
        <MeasurementsIntro tone="dark" withPrevious withBenchmark={false} />
        {METRICS.slice(0, 3).map((metric, index) => (
          <MeasuredMetricRow
            key={metric.name}
            metric={{
              ...metric,
              lead: index === 1 ? "Needs work." : "Solid.",
              previous:
                metric.reference.kind === "session"
                  ? { value: metric.reference.band[0], label: "Last session" }
                  : { value: metric.value * 0.94, label: "Last session" },
              deltaPill:
                index === 1
                  ? { text: "▼ 0.3 cm", dir: "down" }
                  : { text: "▲ 4", dir: "up" },
            }}
            tone="dark"
          />
        ))}
      </div>
      <SessionsChart history={DEMO_HISTORY} today={82} tone="dark" />
      <FocusBlock
        focus={{
          title: "Your bat swing",
          detail: WEAKEST,
          drill: DRILL,
          remeasure: "swing path",
        }}
        nextScore={nextScoreFor(82)}
        tone="dark"
      />
      <CoachStamp tone="dark" />
    </div>
  );
}

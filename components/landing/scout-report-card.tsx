import { Kicker } from "@/components/ui";

/**
 * Landing-page preview of an AI coaching report: the same pitch-800
 * scoreboard card players see in the app (ReportPanel's dark tone), filled
 * with a real spell from Aryaman Varma's session footage — the batter in the
 * hero video above it.
 */

type Metric = {
  name: string;
  score: number;
  delta?: { direction: "up" | "down"; amount: string };
  workOn?: boolean;
  measured: string;
  drill?: string;
};

const METRICS: Metric[] = [
  {
    name: "Head stability",
    score: 88,
    delta: { direction: "up", amount: "+3" },
    measured:
      "0.21 torso-widths of drift through the shot. Your head stays quiet from trigger to contact.",
  },
  {
    name: "Shot tempo",
    score: 85,
    measured:
      "0.38s trigger-to-contact. Unhurried. You're picking length early enough to play the ball late.",
  },
  {
    name: "Balance at contact",
    score: 84,
    delta: { direction: "up", amount: "+2" },
    measured:
      "0.11 torso-widths of lean at contact. Shoulders stacked over hips at the moment it matters.",
  },
  {
    name: "Front-foot stride",
    score: 71,
    delta: { direction: "down", amount: "−2" },
    workOn: true,
    measured:
      "0.58 torso-widths (spell average). The stride shortens on fuller deliveries — you're reaching with hands where the foot should travel.",
    drill:
      "Throwdown drives with a cone at 0.8 torso-widths; foot to the cone before the hands go.",
  },
];

export function ScoutReportCard() {
  return (
    <section className="rounded-[12px] bg-pitch-800 bg-[repeating-linear-gradient(0deg,transparent_0_44px,rgba(0,0,0,.10)_44px_46px)] px-[26px] pt-[22px] pb-3 text-cream-200 shadow-2xl shadow-black/45">
      <div className="flex items-end justify-between gap-4 border-b border-cream-200/15 pb-3.5">
        <div>
          <Kicker tone="dark">Coaching report</Kicker>
          <div className="mt-2 font-mono text-[11px] text-sage-400">
            Aryaman Varma · Front-foot drive · RHB
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[44px] leading-none font-semibold text-gold-500">82</div>
          <div className="mt-0.5 font-display text-[11px] tracking-[.22em] text-sage-400 uppercase">
            Overall / 100
          </div>
        </div>
      </div>

      <p className="border-b border-cream-200/15 py-3 text-[13px] leading-[1.6] text-cream-200">
        A composed spell with a genuinely still head — the stride is what&apos;s holding the
        rest back.
      </p>

      {METRICS.map((metric) => (
        <div key={metric.name} className="border-b border-cream-200/15 py-[11px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-sm tracking-[.08em] uppercase">
              {metric.name}
              {metric.workOn && (
                <span className="ml-2 rounded-sm bg-rust-500/20 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tracking-[.18em] text-rust-500">
                  Work-on
                </span>
              )}
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold">
              <span className={metric.workOn ? "text-rust-500" : "text-gold-500"}>
                {metric.score}
              </span>
              {metric.delta && (
                <span
                  className={`ml-2 text-[11px] ${
                    metric.delta.direction === "up" ? "text-sage-400" : "text-rust-500"
                  }`}
                >
                  {metric.delta.direction === "up" ? "▲" : "▼"} {metric.delta.amount}
                </span>
              )}
            </span>
          </div>
          <div aria-hidden className="mt-[7px] h-[3px] overflow-hidden rounded-sm bg-black/30">
            <div
              className={`h-full rounded-sm ${metric.workOn ? "bg-rust-500" : "bg-gold-500"}`}
              style={{ width: `${metric.score}%` }}
            />
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-sage-400">
            <span className="font-semibold text-cream-200">Measured:</span> {metric.measured}
          </p>
          {metric.drill && (
            <p className="mt-1 text-[12.5px] leading-relaxed text-sage-400">
              <span className="font-semibold text-gold-500">Drill:</span> {metric.drill}
            </p>
          )}
        </div>
      ))}

      <div className="border-b border-cream-200/15 py-3">
        <Kicker tone="dark">Elite benchmark</Kicker>
        <p className="mt-2 font-mono text-[11.5px] tracking-[.04em] text-cream-200">
          Head 88 → 92+ · Stride 71 → 90+ · Tempo 85 → 88+
        </p>
      </div>

      <div className="py-3">
        <Kicker tone="dark">What to work on</Kicker>
        <p className="mt-2 text-[12.5px] leading-relaxed text-cream-200">
          Stride length. Cone drill, 20 balls, twice a week. We will measure it next upload.
        </p>
        <p className="mt-2.5 font-mono text-[10.5px] text-sage-400">
          Reviewed by J. Carter, ECB Level 2.
        </p>
      </div>
    </section>
  );
}

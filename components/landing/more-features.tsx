import { Kicker } from "@/components/ui";

// The end-to-end journey, in order: a session becomes a report, a report earns
// a connection, a connection gets you found. Rendered as a sequence so the
// "end-to-end" claim reads visually, not just as four loose cards. The journey
// deliberately ends on getting found — scouting is the pitch, everything else
// is the value-add layer. Step 04 sits on the scoreboard so the destination
// reads heavier than the three paper cards leading to it.
const STEPS = [
  {
    step: "01",
    title: "Sessions",
    body: "Track sessions, goals, and match stats across the season.",
  },
  {
    step: "02",
    title: "AI report",
    body: "Every upload becomes a numbers-first coaching report — real measurements, not scores. When the footage doesn't show enough to measure honestly, the report says so. Coaches you connect with watch the video itself and leave their own feedback.",
  },
  {
    step: "03",
    title: "Coach connections",
    body: "Coaches send connection requests to promising players and build their roster. Players can also request to connect with coaches.",
  },
  {
    step: "04",
    title: "Get found",
    body: "Coaches and scouts search the player pool, watch your footage, and read your numbers. Interest comes to you — trials, sessions, a place in a squad.",
  },
];

export function MoreFeatures() {
  return (
    <section className="bg-cream-100 px-6 py-24 sm:px-12">
      <div className="mx-auto w-full max-w-[1200px]">
        <header className="mb-14 text-center">
          <Kicker>One platform</Kicker>
          <h2 className="mt-3 font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] uppercase sm:text-5xl">
            End-to-end provider
          </h2>
        </header>

        <div className="flex flex-col items-stretch gap-4 lg:flex-row">
          {STEPS.map((step, i) => {
            const destination = step.step === "04";
            return (
              <div key={step.step} className="contents">
                <div
                  className={`flex-1 rounded-[10px] p-6 ${
                    destination ? "bg-pitch-900" : "border border-cream-400 bg-white"
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] font-semibold tracking-[.2em] ${
                      destination ? "text-gold-500" : "text-rust-600"
                    }`}
                  >
                    {step.step}
                  </span>
                  <h3
                    className={`mt-2 font-display text-lg leading-tight font-semibold uppercase ${
                      destination ? "text-cream-50" : ""
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
                      destination ? "text-sage-400" : "text-ink-600"
                    }`}
                  >
                    {step.body}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="self-center font-mono text-2xl text-rust-600/50 max-lg:rotate-90"
                  >
                    →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

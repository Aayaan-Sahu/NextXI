import type { LandingCopy } from "@/components/landing/copy";
import { BandHeading } from "@/components/landing/landing-ui";
import { Kicker } from "@/components/ui";

// The end-to-end journey, in order: a session becomes a report, a report earns
// a connection, a connection gets you found. Rendered as a sequence so the
// "end-to-end" claim reads visually, not just as four loose cards. The journey
// deliberately ends on getting found — scouting is the pitch, everything else
// is the value-add layer. Step 04 sits on the scoreboard so the destination
// reads heavier than the three paper cards leading to it.
// The words live in `copy.ts` (per language), in this order.
const STEPS = ["01", "02", "03", "04"] as const;

export function MoreFeatures({ copy }: { copy: LandingCopy["more"] }) {
  return (
    <section className="bg-cream-100 px-6 py-24 sm:px-12">
      <div className="mx-auto w-full max-w-[1200px]">
        <header className="mb-14 text-center">
          <Kicker>{copy.kicker}</Kicker>
          <BandHeading className="mt-3">{copy.heading}</BandHeading>
        </header>

        <div className="flex flex-col items-stretch gap-4 lg:flex-row">
          {STEPS.map((step, i) => {
            const destination = step === "04";
            const { title, body } = copy.items[i];
            return (
              <div key={step} className="contents">
                <div
                  className={`flex-1 rounded-[10px] p-6 ${
                    destination ? "bg-pitch-900" : "border border-cream-400 bg-cream-50"
                  }`}
                >
                  <span
                    className={`text-caption font-semibold tracking-[.16em] tabular-nums ${
                      destination ? "text-amber-500" : "text-rust-600"
                    }`}
                  >
                    {step}
                  </span>
                  <h3
                    className={`mt-2 font-display text-title font-semibold uppercase ${
                      destination ? "text-cream-50" : "text-ink-900"
                    }`}
                  >
                    {title}
                  </h3>
                  <p
                    className={`mt-2 text-ui ${destination ? "text-cream-200" : "text-ink-600"}`}
                  >
                    {body}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="self-center text-title text-cream-500 max-lg:rotate-90"
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

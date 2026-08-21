import type { LandingCopy } from "@/components/landing/copy";
import { BandHeading } from "@/components/landing/landing-ui";
import { Kicker } from "@/components/ui";

/**
 * Safety as product chrome: three cells whose anatomy matches a dark-header
 * card (scanline board, kicker, title, one fact on cream). Written for the
 * people who actually approve a young player's signup. The words live in
 * `copy.ts`, per language.
 */
export function TrustStrip({ copy }: { copy: LandingCopy["trust"] }) {
  return (
    <section className="bg-pitch-900">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-16 sm:px-12 sm:py-20">
        <Kicker tone="dark">{copy.kicker}</Kicker>
        <BandHeading tone="dark" className="mt-3 max-w-[24ch]">
          {copy.heading}
        </BandHeading>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {copy.gates.map((gate) => (
            <article
              key={gate.title}
              className="overflow-hidden rounded-[10px] border border-cream-400 bg-cream-50"
            >
              <div className="relative px-6 py-5 text-cream-200">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-thumb-scanlines"
                />
                <div className="relative">
                  <Kicker tone="dark">{gate.kicker}</Kicker>
                  <h3 className="mt-2 font-display text-title font-semibold text-cream-50 uppercase">
                    {gate.title}
                  </h3>
                </div>
              </div>
              <p className="px-6 py-4 text-ui text-ink-800">{gate.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

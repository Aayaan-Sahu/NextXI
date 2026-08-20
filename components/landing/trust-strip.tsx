import { BandHeading } from "@/components/landing/landing-ui";
import { Kicker } from "@/components/ui";

/**
 * Safety as product chrome: three cells whose anatomy matches a dark-header
 * card (scanline board, kicker, title, one fact on cream). Written for the
 * people who actually approve a young player's signup.
 */
const GATES = [
  {
    kicker: "Under 18",
    title: "Guardians see everything",
    body: "For players under the age of 18, parents/guardians get their own account linked to their child's. They see every report and every message.",
  },
  {
    kicker: "Coaches",
    title: "Verified before contact",
    body: "Every coach is checked and approved by us before they can contact any player.",
  },
  {
    kicker: "Footage",
    title: "Your videos, your call",
    body: "Videos stay private unless the player decides otherwise.",
  },
];

export function TrustStrip() {
  return (
    <section className="bg-pitch-900">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-16 sm:px-12 sm:py-20">
        <Kicker tone="dark">Built safe for youth cricket</Kicker>
        <BandHeading tone="dark" className="mt-3 max-w-[24ch]">
          The adults stay in the loop
        </BandHeading>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {GATES.map((gate) => (
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

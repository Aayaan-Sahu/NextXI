import { Kicker } from "@/components/ui";

/**
 * Safety as product chrome: three GatePanel-shaped cells (pitch header,
 * kicker, title, one mono fact on cream). Anatomy matches `GatePanel` /
 * `StatusBoard` without using those primitives — they render `<h1>` and a
 * prose description, which is wrong for three marketing cells.
 */
const GATES = [
  {
    kicker: "Under 18",
    title: "Guardians see everything",
    fact: "Linked account · every report · every message",
  },
  {
    kicker: "Coaches",
    title: "Verified before contact",
    fact: "Admin-approved · then they can write",
  },
  {
    kicker: "Footage",
    title: "Your videos, your call",
    fact: "Private unless the player opens them",
  },
];

export function TrustStrip() {
  return (
    <section className="bg-pitch-900">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-16 sm:px-12 sm:py-20">
        <Kicker tone="dark">Built safe for youth cricket</Kicker>
        <h2 className="mt-3 max-w-[24ch] font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] text-cream-50 uppercase sm:text-5xl">
          The adults stay in the loop
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {GATES.map((gate) => (
            <article
              key={gate.title}
              className="overflow-hidden rounded-[12px] border border-cream-400 bg-cream-50"
            >
              <div className="relative border-b border-gold-500/40 bg-pitch-800 px-6 py-5 text-cream-200">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-thumb-scanlines opacity-40"
                />
                <div className="relative">
                  <Kicker tone="dark">{gate.kicker}</Kicker>
                  <h3 className="mt-2 font-display text-xl leading-tight font-semibold tracking-[.02em] text-cream-50 uppercase">
                    {gate.title}
                  </h3>
                </div>
              </div>
              <p className="px-6 py-4 font-mono text-[11px] font-semibold tracking-[.08em] text-ink-900">
                {gate.fact}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

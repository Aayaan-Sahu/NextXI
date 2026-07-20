import { Kicker } from "@/components/ui";

const TRUST_ITEMS = [
  {
    title: "Guardians see everything",
    body: "For players under the age of 18, parents/guardians get their own account linked to their child's. They see every report and every message.",
  },
  {
    title: "Coaches are verified",
    body: "Every coach is checked and approved by us before they can contact any player.",
  },
  {
    title: "Your videos, your call",
    body: "Videos stay private unless the player decides otherwise.",
  },
];

/** Dark band for the people who actually approve a young player's signup. */
export function TrustStrip() {
  return (
    <section className="bg-pitch-900">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-16 sm:px-12 sm:py-20">
        <Kicker tone="dark">Built safe for youth cricket</Kicker>
        <h2 className="mt-3 max-w-[24ch] font-display text-3xl leading-[1.02] font-bold text-cream-50 uppercase sm:text-4xl">
          The adults stay in the loop
        </h2>
        <div className="mt-10 grid gap-9 sm:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title}>
              <h3 className="font-display text-xl leading-tight font-semibold text-cream-200 uppercase">
                {item.title}
              </h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-sage-400">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

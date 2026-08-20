import { BandHeading } from "@/components/landing/landing-ui";
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
        <BandHeading tone="dark" className="mt-3 max-w-[24ch]">
          The adults stay in the loop
        </BandHeading>
        <div className="mt-10 grid gap-9 sm:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title}>
              <h3 className="font-display text-title font-semibold text-cream-50 uppercase">
                {item.title}
              </h3>
              <p className="mt-2.5 text-ui text-cream-200/80">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

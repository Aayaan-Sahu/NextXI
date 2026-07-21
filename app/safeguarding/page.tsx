import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/landing/info-page";

export const metadata: Metadata = {
  title: "Safeguarding",
  description:
    "How NextXI is built to keep young cricketers safe: guardian-linked accounts, verified coaches, and player-controlled visibility.",
};

export default function SafeguardingPage() {
  return (
    <InfoPage
      title="Safeguarding"
      intro="NextXI exists for young players, which means safety is not a feature we bolt on — it is the shape of the platform. This page states plainly how it works. The full safeguarding policy will be published before the platform opens."
    >
      <InfoSection title="Guardians see everything">
        <p>
          Players under 18 need a linked guardian account before their profile can be seen by
          anyone. Guardians get full visibility of their player&apos;s videos, coaching reports,
          connections, and messages — not a summary, the actual thing.
        </p>
      </InfoSection>
      <InfoSection title="Coaches are verified before contact">
        <p>
          Every coach and scout is checked and approved by the NextXI team before they can view
          full profiles or contact any player. Until approval, a coach account can do nothing that
          touches a player.
        </p>
      </InfoSection>
      <InfoSection title="Your videos, your call">
        <p>
          Players (and their guardians) control who can see each video. Nothing is public by
          default, and taking a video down takes it down everywhere — including any coaching
          report built from it.
        </p>
      </InfoSection>
      <InfoSection title="About the footage on our site">
        <p>
          The batting footage and analysis overlay on our landing page are staged demonstration
          material, prepared for illustration — not live analysis of a platform user.
        </p>
      </InfoSection>
      <InfoSection title="Raising a concern">
        <p>
          If you ever have a safeguarding concern about anything on NextXI, contact us and it goes
          to the top of the pile. See the <Link className="font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline" href="/contact">contact page</Link> for how to reach us.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/landing/info-page";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What NextXI collects today (a waitlist email), and the privacy commitments the platform is being built against.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy"
      intro="NextXI is pre-launch. This page says plainly what we collect today and the commitments the platform is being built against. The full privacy policy will be published before accounts open."
    >
      <InfoSection title="What we collect today">
        <p>
          One thing: the email address you give the waitlist. We use it to send one email when
          early access opens. We don&apos;t sell it, share it, or add it to anything else.
        </p>
        <p className="text-ink-600">
          Want off the list? Reply to any email we send you and we&apos;ll remove your address.
        </p>
      </InfoSection>
      <InfoSection title="What launch will add">
        <p>
          When the platform opens it will hold accounts for players, guardians, and coaches;
          uploaded technique videos; and the coaching reports built from them. Each of those will
          be governed by the full policy — published, in plain language, before anyone can sign
          up.
        </p>
      </InfoSection>
      <InfoSection title="Commitments we're building against">
        <p>
          Players under 18 need a linked guardian who sees everything. Coaches are verified before
          they can contact any player. Players and guardians control who sees each video. Deleting
          a video removes it everywhere, and account deletion removes the account&apos;s data. The
          full policy will state each of these as a binding term, not marketing.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

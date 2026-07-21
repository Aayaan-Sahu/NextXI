import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/landing/info-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "NextXI waitlist terms, and what the full terms of service will cover at launch.",
};

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms"
      intro="NextXI is pre-launch, so the only live agreement is the waitlist. The full terms of service will be published before accounts open."
    >
      <InfoSection title="The waitlist">
        <p>
          Joining the waitlist creates no account and no obligation — it means we may send you one
          email when early access opens. You can come off the list at any time by replying to any
          email we send you.
        </p>
      </InfoSection>
      <InfoSection title="What the full terms will cover">
        <p>
          Before signup opens, the full terms will be published covering — at minimum — who may
          hold an account and the guardian requirement for minors, ownership of uploaded footage
          (players keep it), how coaching reports may be used, coach conduct and verification, and
          what gets an account removed.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

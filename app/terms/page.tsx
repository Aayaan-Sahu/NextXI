import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/landing/info-page";
import { POLICY_VERSION } from "@/lib/policy";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The NextXI terms of use in plain language: who can hold an account, guardian consent, ownership of footage, coaching reports, conduct, and deletion.",
};

const infoLink = (href: string, label: string) => (
  <Link
    className="font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline"
    href={href}
  >
    {label}
  </Link>
);

export default function TermsPage() {
  return (
    <InfoPage
      status={`Draft — under review · v${POLICY_VERSION}`}
      title="Terms of Use"
      intro="These are the terms for using NextXI, in plain language. Creating an account means agreeing to them. They are a draft, published for review during the pilot."
    >
      <InfoSection title="Who can hold an account">
        <p>
          Three roles hold accounts. <strong>Players</strong> — if you are under 18, your
          account stays pending until a parent or legal guardian links to it with your approval
          code and confirms their consent. <strong>Guardians</strong> — you must actually be
          the player&apos;s parent or legal guardian to link to their account; you then see
          everything on it. <strong>Coaches</strong> — every coach is checked and approved by
          the NextXI team before they can view full profiles or contact any player.
        </p>
      </InfoSection>
      <InfoSection title="Guardian consent">
        <p>
          When a guardian links to a player&apos;s account, they are confirming they are that
          player&apos;s parent or legal guardian and consenting to the player&apos;s use of
          NextXI — including the collection and analysis described in the{" "}
          {infoLink("/privacy", "privacy policy")}. A guardian can withdraw that consent at any
          time by deleting the player&apos;s data or asking us via the{" "}
          {infoLink("/contact", "contact page")}; withdrawing consent ends the player&apos;s
          use of the platform.
        </p>
      </InfoSection>
      <InfoSection title="Your footage stays yours">
        <p>
          Players own the footage they upload. By uploading, you give NextXI permission to
          host, process, and analyse it — including AI analysis and, during the pilot, manual
          handling by team members — solely to run the service: producing your coaching reports
          and showing your videos to the people you have approved. Only upload footage of
          yourself, and only footage you have the right to share. Deleting a video removes it
          everywhere, including any report built from it.
        </p>
      </InfoSection>
      <InfoSection title="Coaching reports">
        <p>
          Reports are produced by automated analysis of your videos and are a coaching aid, not
          professional coaching, selection advice, or medical guidance. They can be incomplete
          or wrong: the models measure only what a video actually shows, cover some disciplines
          and not others, and will decline to score a video rather than guess. Treat a report
          as one input alongside a real coach&apos;s judgment.
        </p>
      </InfoSection>
      <InfoSection title="Conduct">
        <p>
          NextXI exists to keep young players safe, and accounts that put that at risk are
          removed. That includes: impersonating someone else or misstating your role, uploading
          footage of other people, harassment or inappropriate contact of any kind, and coaches
          taking contact with a player outside the platform to avoid guardian visibility. How
          the platform is built around player safety is on the{" "}
          {infoLink("/safeguarding", "safeguarding page")}; concerns raised through the{" "}
          {infoLink("/contact", "contact page")} go to the top of the pile.
        </p>
      </InfoSection>
      <InfoSection title="Deleting your account">
        <p>
          You can delete your account at any time from your profile page — the deletion is
          immediate and permanent, and removes your profile, videos, reports, messages, and
          connections as described in the {infoLink("/privacy", "privacy policy")}. A guardian
          account that oversees a linked player cannot be deleted until the player&apos;s
          account is deleted first, so no under-18 account is ever left without oversight.
        </p>
      </InfoSection>
      <InfoSection title="The pilot service">
        <p>
          NextXI is a young product running as a pilot. The service is provided as it stands:
          features may change, analysis may be delayed while reports are processed, and we do
          not promise uninterrupted service. Nothing in these terms removes rights that UK law
          gives you.
        </p>
      </InfoSection>
      <InfoSection title="Changes and governing law">
        <p>
          If these terms change in a way that matters, we will tell you and, where the change
          needs it, ask for your agreement again — the version each account agreed to is
          recorded when the account is set up. These terms are expected to be governed by the
          law of England and Wales; that, like the rest of this draft, is subject to legal
          review.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

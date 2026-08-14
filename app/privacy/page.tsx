import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/landing/info-page";
import { POLICY_VERSION } from "@/lib/policy";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "The NextXI privacy policy in plain language: what we collect, who can see it, how long we keep it, and the rights players and guardians have over it.",
};

const contactLink = (
  <Link
    className="font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline"
    href="/contact"
  >
    contact page
  </Link>
);

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      intro="This policy says in plain language what NextXI collects, who can see it, how long we keep it, and the rights you have over it. It is written to be readable by the young players it protects, and by their parents."
    >
      <p className="font-mono text-[11px] font-semibold tracking-[.14em] text-ink-600 uppercase">
        Draft — under review · Version {POLICY_VERSION}
      </p>
      <InfoSection title="Who we are">
        <p>
          NextXI is a cricket talent platform for young players: you upload technique videos,
          get coaching reports built from them, and connect with verified coaches while your
          parent or guardian sees everything. NextXI is the data controller for the platform.
          To reach us about anything in this policy, use the {contactLink}.
        </p>
      </InfoSection>
      <InfoSection title="What we collect">
        <p>Only what the platform needs to work:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Account</strong> — your email address, a username, and a
            sign-in code (or a password if you set one later). The sign-in
            provider holds the password; we never see it.
          </li>
          <li>
            <strong>Profile</strong> — name, date of birth, club, country, height, optional
            weight, playing roles, and an optional photo and bio.
          </li>
          <li>
            <strong>Videos</strong> — the technique videos you upload, plus the thumbnails made
            from them.
          </li>
          <li>
            <strong>Coaching reports</strong> — the analysis built from each video.
          </li>
          <li>
            <strong>Cricket records</strong> — match stats, goals, reminders, and practice
            sessions you choose to enter.
          </li>
          <li>
            <strong>Messages</strong> — conversations with your approved connections.
          </li>
          <li>
            <strong>Waitlist</strong> — an email address, if you joined the waitlist before
            launch.
          </li>
        </ul>
      </InfoSection>
      <InfoSection title="Who can see it">
        <p>
          Everything is private by default. Beyond you, your data is visible only to: the
          coaches you (or your guardian) approve a connection with, who can then see your
          profile, videos, and reports and message you; your linked guardian, who sees
          everything on your account — videos, reports, messages, and connections, not a
          summary; and NextXI team members, when needed to run the service. During the pilot
          that includes manual processing: a team member may handle or watch a video to run the
          analysis, check quality, or investigate a fault.
        </p>
        <p>
          We do not sell your data, show you advertising, or share your data with anyone
          outside that list unless the law requires it.
        </p>
      </InfoSection>
      <InfoSection title="How the video analysis works">
        <p>
          Uploaded videos are analysed by computer-vision models to produce a coaching report
          on your technique. The models only report what they can actually see: every report
          carries a coverage measure, and when a video does not show enough of your action to
          measure honestly, the report says so instead of guessing. Some disciplines are
          covered by the models and some are not yet. During the pilot, team members may run
          the analysis pipeline by hand. Reports are a coaching aid, not a verdict on you as a
          player.
        </p>
      </InfoSection>
      <InfoSection title="Children and guardian consent">
        <p>
          NextXI is built around the ICO Children&apos;s Code. If you are under 18, your
          account stays pending until a parent or legal guardian links to it with your approval
          code and confirms their consent — that guardian consent is our lawful basis for
          processing your data. Guardians keep full visibility for as long as the account
          exists. Accounts default to private, we collect only what the service needs, and
          there is no advertising, no selling of data, and no profiling beyond the coaching
          analysis you asked for.
        </p>
      </InfoSection>
      <InfoSection title="How long we keep it">
        <p>
          Until you delete it. Deleting a video removes it everywhere, including the coaching
          report built from it. Deleting your account — from your profile page, or by asking us
          via the {contactLink} — removes your profile, videos, reports, messages, and
          connections. Residual copies in our hosting provider&apos;s routine backups fall away
          on their normal cycle. A waitlist email is kept only until we send the launch email,
          or until you ask to come off the list.
        </p>
      </InfoSection>
      <InfoSection title="Your rights">
        <p>
          Under UK GDPR you can ask for a copy of your data, have mistakes corrected, have it
          erased (use the delete flows above, or ask via the {contactLink}), restrict or object
          to processing, and take your data elsewhere. A guardian can exercise these rights for
          their linked child. If you are unhappy with how we handle your data, you can complain
          to the UK Information Commissioner&apos;s Office at ico.org.uk.
        </p>
      </InfoSection>
      <InfoSection title="Changes to this policy">
        <p>
          This is a draft, published for review during the pilot. If it changes in a way that
          matters, we will tell you and, where the change needs it, ask for your consent again.
          The version each account agreed to is recorded when the account is set up.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

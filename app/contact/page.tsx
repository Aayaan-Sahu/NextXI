import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/landing/info-page";
import { CONTACT_EMAIL, contactMailto, safeguardingMailto } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach the NextXI team, including safeguarding concerns.",
};

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact"
      intro="We're a small team, and a human reads everything."
    >
      <InfoSection title="Reaching us">
        <p>
          Email{" "}
          <a
            className="font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline"
            href={contactMailto()}
          >
            {CONTACT_EMAIL}
          </a>
          . If you joined the waitlist, you can also reply to any email we send
          you — replies come to the same inbox.
        </p>
      </InfoSection>
      <InfoSection title="Safeguarding concerns">
        <p>
          Anything touching the safety of a young player goes to the top of the
          pile. Write to{" "}
          <a
            className="font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline"
            href={safeguardingMailto()}
          >
            {CONTACT_EMAIL}
          </a>{" "}
          with &ldquo;safeguarding&rdquo; in the subject line. Read how the
          platform is built around player safety on the{" "}
          <Link
            className="font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline"
            href="/safeguarding"
          >
            safeguarding page
          </Link>
          .
        </p>
      </InfoSection>
    </InfoPage>
  );
}

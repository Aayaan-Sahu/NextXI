import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/components/landing/info-page";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach the NextXI team before launch.",
};

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact"
      intro="We're a small team building NextXI ahead of launch, and a human reads everything."
    >
      <InfoSection title="Reaching us today">
        <p>
          If you&apos;re on the waitlist, reply to any email we send you — replies come straight to
          the team. A public contact address will be published here before launch.
        </p>
        {/* TODO(owner): add the public contact address / safeguarding contact before launch. */}
      </InfoSection>
      <InfoSection title="Safeguarding concerns">
        <p>
          Anything touching the safety of a young player goes to the top of the pile — say
          &ldquo;safeguarding&rdquo; in the subject line. Read how the platform is built around
          player safety on the{" "}
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

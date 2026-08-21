import Link from "next/link";
import type { LandingCopy } from "@/components/landing/copy";
import { BandHeading } from "@/components/landing/landing-ui";
import { WaitlistForm, type WaitlistState } from "@/components/landing/waitlist-form";

/** Closing ask: create an account, with waitlist as a quieter fallback. */
export function FinalCta({
  copy,
  waitlist,
  waitlistCopy,
}: {
  copy: LandingCopy["cta"];
  waitlist?: WaitlistState;
  waitlistCopy: LandingCopy["waitlist"];
}) {
  return (
    <section className="bg-seam-stitch">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-6 py-16 text-center sm:px-12 sm:py-20">
        <BandHeading tone="dark" className="max-w-[20ch]">
          {copy.heading}
        </BandHeading>
        <p className="mt-4 max-w-[42ch] text-body text-cream-200/80">{copy.body}</p>
        <Link
          className="mt-8 rounded-md bg-gold-500 px-5 py-2.5 text-ui font-semibold text-ink-900 no-underline hover:bg-gold-600"
          href="/auth?mode=sign-up"
        >
          {copy.button}
        </Link>
        <div className="mt-10 w-full scroll-mt-24" id="waitlist">
          <p className="mb-3 text-caption text-cream-200/70">{copy.waitlistPrompt}</p>
          <WaitlistForm align="center" copy={waitlistCopy} waitlist={waitlist} />
        </div>
      </div>
    </section>
  );
}

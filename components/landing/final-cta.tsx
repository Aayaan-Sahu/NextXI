import Link from "next/link";
import { WaitlistForm, type WaitlistState } from "@/components/landing/waitlist-form";

/** Closing ask: create an account, with waitlist as a quieter fallback. */
export function FinalCta({ waitlist }: { waitlist?: WaitlistState }) {
  return (
    <section className="bg-seam-stitch">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-6 py-16 text-center sm:px-12 sm:py-20">
        <h2 className="max-w-[20ch] font-display text-4xl leading-[0.98] font-bold text-cream-50 uppercase sm:text-5xl">
          Ready to get seen.
        </h2>
        <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-cream-200/80">
          Create a player, coach, or guardian account. It takes a couple of minutes.
        </p>
        <Link
          className="mt-8 rounded-md bg-cream-50 px-5 py-3 text-sm font-bold text-rust-700 no-underline hover:bg-cream-100"
          href="/auth?mode=sign-up"
        >
          Create account
        </Link>
        <div className="mt-10 w-full scroll-mt-24" id="waitlist">
          <p className="mb-3 text-[13px] text-sage-400">
            Not ready yet? Leave your email and we&apos;ll ping you.
          </p>
          <WaitlistForm align="center" waitlist={waitlist} />
        </div>
      </div>
    </section>
  );
}

import { WaitlistForm, type WaitlistState } from "@/components/landing/waitlist-form";

/** Closing waitlist ask on the same seam-red as the hero. */
export function FinalCta({ waitlist }: { waitlist?: WaitlistState }) {
  return (
    <section className="bg-seam-stitch">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center px-6 py-16 text-center sm:px-12 sm:py-20">
        <h2 className="max-w-[20ch] font-display text-4xl leading-[0.98] font-bold text-cream-50 uppercase sm:text-5xl">
          Be first to know when we launch.
        </h2>
        <p className="mt-4 text-[15px] text-cream-200">
          We&apos;re starting with a handful of clubs, so early spots are limited.
        </p>
        <div className="mt-8 w-full scroll-mt-24" id="waitlist">
          <WaitlistForm align="center" waitlist={waitlist} />
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Wordmark } from "@/components/ui";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500";

/**
 * Menu bar above the seam-stitch hero. A darker rust than the hero plus a
 * hard bottom border keeps it reading as its own bar instead of bleeding
 * into the stitch pattern below.
 */
export function LandingNav() {
  return (
    <header className="border-b-2 border-pitch-950/30 bg-rust-700">
      <nav className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-6 sm:gap-6 sm:px-12">
        <Wordmark tone="dark" />
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            className={`text-sm font-semibold text-sage-400 no-underline hover:text-cream-200 ${focusRing}`}
            href="/#how-it-works"
          >
            How it works
          </Link>
          <Link
            className={`text-sm font-semibold text-sage-400 no-underline max-lg:hidden hover:text-cream-200 ${focusRing}`}
            href="/#sample-report"
          >
            Sample report
          </Link>
          <Link
            className={`text-sm font-semibold text-sage-400 no-underline max-lg:hidden hover:text-cream-200 ${focusRing}`}
            href="/#safeguarding"
          >
            Safeguarding
          </Link>
          <Link
            className={`text-sm font-semibold text-sage-400 no-underline hover:text-cream-200 ${focusRing}`}
            href="/auth"
          >
            Sign in
          </Link>
          {/* Hidden on phones, where the bar can't fit a third item; the sign-in
              card's "Create account" footer link covers that path. */}
          <Link
            className={`text-sm font-semibold text-sage-400 no-underline max-sm:hidden hover:text-cream-200 ${focusRing}`}
            href="/auth?mode=sign-up"
          >
            Create account
          </Link>
          <a
            className={`rounded-md bg-cream-50 px-4 py-2.5 text-sm font-bold text-rust-700 no-underline hover:bg-cream-100 ${focusRing}`}
            href="#waitlist"
          >
            Join the waitlist
          </a>
        </div>
      </nav>
    </header>
  );
}

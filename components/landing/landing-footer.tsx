import Link from "next/link";
import { Wordmark } from "@/components/ui";

export function LandingFooter() {
  const focusRing =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500";

  return (
    <footer className="bg-pitch-950 px-6 py-10 sm:px-12">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="flex items-center justify-between gap-4 max-md:flex-col">
          <div className="flex flex-col gap-1 max-md:items-center">
            <Wordmark tone="dark" />
            <p className="text-[13px] text-cream-200/50">
              Cricket talent, seen properly.
            </p>
          </div>
          <nav className="flex items-center gap-6 text-sm font-semibold text-cream-200/70">
            <Link href="/auth" className={`hover:text-gold-500 ${focusRing}`}>
              Sign in
            </Link>
            <Link href="/#waitlist" className={`hover:text-gold-500 ${focusRing}`}>
              Join the waitlist
            </Link>
            <span className="font-mono text-[11px] font-normal text-cream-200/40">
              © 2026 NextXI
            </span>
          </nav>
        </div>
        {/* The receipts row: safeguarding is the product's differentiator, so it leads. */}
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-cream-200/10 pt-6 max-md:flex-col">
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] font-semibold text-cream-200/60">
            <Link href="/#how-it-works" className={`hover:text-gold-500 ${focusRing}`}>
              How it works
            </Link>
            <Link href="/#sample-report" className={`hover:text-gold-500 ${focusRing}`}>
              Sample report
            </Link>
            <Link href="/safeguarding" className={`hover:text-gold-500 ${focusRing}`}>
              Safeguarding
            </Link>
            <Link href="/privacy" className={`hover:text-gold-500 ${focusRing}`}>
              Privacy
            </Link>
            <Link href="/terms" className={`hover:text-gold-500 ${focusRing}`}>
              Terms
            </Link>
            <Link href="/contact" className={`hover:text-gold-500 ${focusRing}`}>
              Contact
            </Link>
          </nav>
          <p className="text-[12.5px] text-cream-200/40 max-md:text-center">
            Built for young players, their guardians, and the coaches who find them.
          </p>
        </div>
      </div>
    </footer>
  );
}

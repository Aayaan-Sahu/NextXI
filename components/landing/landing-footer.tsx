import Link from "next/link";
import { getLandingCopy, type LandingCopy } from "@/components/landing/copy";
import { Wordmark } from "@/components/ui";

/** Defaults to English: the info pages (privacy, terms, …) share this footer
    and are only written in English. The landing page passes its language. */
export function LandingFooter({
  copy = getLandingCopy("en").footer,
}: {
  copy?: LandingCopy["footer"];
}) {
  const focusRing =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500";

  return (
    <footer className="bg-pitch-950 px-6 py-10 sm:px-12">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="flex items-center justify-between gap-4 max-md:flex-col">
          <div className="flex flex-col gap-1 max-md:items-center">
            <Wordmark accent="peach" tone="dark" />
            <p className="text-caption text-cream-200/60">{copy.tagline}</p>
          </div>
          <nav className="flex items-center gap-6 text-ui font-semibold text-cream-200/70">
            <Link href="/auth" className={`hover:text-cream-50 ${focusRing}`}>
              {copy.signIn}
            </Link>
            <Link href="/auth?mode=sign-up" className={`hover:text-cream-50 ${focusRing}`}>
              {copy.createAccount}
            </Link>
            <span className="text-caption font-normal text-cream-200/50">© 2026 NextXI</span>
          </nav>
        </div>
        {/* The receipts row: safeguarding is the product's differentiator, so it leads. */}
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-cream-200/10 pt-6 max-md:flex-col">
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-caption font-semibold text-cream-200/70">
            <Link href="/safeguarding" className={`hover:text-cream-50 ${focusRing}`}>
              {copy.safeguarding}
            </Link>
            <Link href="/privacy" className={`hover:text-cream-50 ${focusRing}`}>
              {copy.privacy}
            </Link>
            <Link href="/terms" className={`hover:text-cream-50 ${focusRing}`}>
              {copy.terms}
            </Link>
            <Link href="/contact" className={`hover:text-cream-50 ${focusRing}`}>
              {copy.contact}
            </Link>
          </nav>
          <p className="text-caption text-cream-200/50 max-md:text-center">{copy.built}</p>
        </div>
      </div>
    </footer>
  );
}

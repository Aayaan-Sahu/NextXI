import Link from "next/link";
import type { LandingCopy, LandingLang } from "@/components/landing/copy";
import { LangToggle } from "@/components/landing/lang-toggle";
import { Wordmark } from "@/components/ui";

/**
 * The brand bar. Same maroon, same 56px height and same 1360px container as
 * the product nav and the info-page header — three different brand bars is
 * how a visitor learns the marketing site and the app are different products.
 *
 * `toggle` is only passed for visitors the page has reason to offer Hindi to
 * (see `resolveLandingLocale`); everyone else gets the bar unchanged.
 */
export function LandingNav({
  copy,
  lang,
  toggle,
}: {
  copy: LandingCopy["nav"];
  lang: LandingLang;
  toggle?: LandingCopy["toggle"];
}) {
  return (
    <header className="bg-rust-600">
      {/* min-h + wrap rather than a fixed h-14: with the language switch in
          the bar, a 320px screen wraps the actions onto a second row instead
          of pushing the page sideways. Everything wider stays one 56px row. */}
      <nav className="mx-auto flex min-h-14 w-full max-w-[1360px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 sm:gap-6 sm:px-10">
        <Wordmark accent="peach" tone="dark" />
        <div className="flex items-center gap-3 sm:gap-6">
          {toggle && <LangToggle copy={toggle} current={lang} />}
          <Link
            className="text-ui font-semibold whitespace-nowrap text-cream-200/70 no-underline hover:text-cream-50"
            href="/auth"
          >
            {copy.signIn}
          </Link>
          <Link
            className="rounded-md bg-gold-500 px-4 py-2 text-ui font-semibold whitespace-nowrap text-ink-900 no-underline hover:bg-gold-600"
            href="/auth?mode=sign-up"
          >
            {copy.createAccount}
          </Link>
        </div>
      </nav>
    </header>
  );
}

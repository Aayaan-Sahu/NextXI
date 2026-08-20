import Link from "next/link";
import { Wordmark } from "@/components/ui";

/**
 * The brand bar. Same maroon, same 56px height and same 1360px container as
 * the product nav and the info-page header — three different brand bars is
 * how a visitor learns the marketing site and the app are different products.
 */
export function LandingNav() {
  return (
    <header className="bg-rust-600">
      <nav className="mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-6 px-6 sm:px-10">
        <Wordmark accent="peach" tone="dark" />
        <div className="flex items-center gap-6">
          <Link
            className="text-ui font-semibold text-cream-200/70 no-underline hover:text-cream-50"
            href="/auth"
          >
            Sign in
          </Link>
          <Link
            className="rounded-md bg-gold-500 px-4 py-2 text-ui font-semibold text-ink-900 no-underline hover:bg-gold-600"
            href="/auth?mode=sign-up"
          >
            Create account
          </Link>
        </div>
      </nav>
    </header>
  );
}
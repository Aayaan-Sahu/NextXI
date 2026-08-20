import Link from "next/link";
import type { ReactNode } from "react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { Kicker, Wordmark } from "@/components/ui";

/**
 * Quiet reading shell for the info pages (privacy, terms, safeguarding,
 * contact): the maroon brand bar, a narrow measure on the cream page ground,
 * and the shared footer. One column, one measure — nothing here is a card.
 */
export function InfoPage({
  title,
  intro,
  eyebrow = "NextXI",
  status,
  children,
}: {
  title: string;
  intro?: string;
  /** What kind of page this is, e.g. "Safeguarding". */
  eyebrow?: string;
  /** Optional review state, e.g. "Draft — under review · v1.3". */
  status?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-rust-600">
        <div className="mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-6 px-6 sm:px-10">
          <Link
            className="no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            href="/"
          >
            <Wordmark tone="dark" />
          </Link>
          <Link
            className="text-ui font-semibold text-cream-200/70 no-underline hover:text-cream-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            href="/"
          >
            ← Back to NextXI
          </Link>
        </div>
      </header>
      <main
        className="mx-auto w-full max-w-[720px] flex-1 px-6 pt-14 pb-14 sm:px-10 sm:pt-16"
        id="main-content"
      >
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
          <Kicker>{eyebrow}</Kicker>
          {status ? (
            <span className="rounded-full bg-cream-250 px-2.5 py-[3px] text-micro font-semibold text-ink-600">
              {status}
            </span>
          ) : null}
        </div>
        <h1 className="mt-4 font-display text-display font-bold tracking-[.02em] uppercase">
          {title}
        </h1>
        {intro && (
          <p className="mt-4 text-lead text-pretty text-ink-800">{intro}</p>
        )}
        <div className="mt-8 grid gap-8">{children}</div>
      </main>
      <LandingFooter />
    </div>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-body font-semibold tracking-[.08em] uppercase">
        {title}
      </h2>
      <div className="mt-3 grid gap-3 text-body text-pretty text-ink-800">
        {children}
      </div>
    </section>
  );
}

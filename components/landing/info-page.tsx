import Link from "next/link";
import type { ReactNode } from "react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { Kicker, Wordmark } from "@/components/ui";

/**
 * Quiet reading shell for the info pages (privacy, terms, safeguarding,
 * contact): the landing nav's rust bar, a narrow measure on the cream page
 * ground, and the shared footer.
 */
export function InfoPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b-2 border-pitch-950/30 bg-rust-700 px-6 sm:px-12">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-6">
          <Link href="/" className="no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500">
            <Wordmark tone="dark" />
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-sage-400 no-underline hover:text-cream-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            Back to NextXI
          </Link>
        </div>
      </header>
      <main
        className="mx-auto w-full max-w-[720px] flex-1 px-6 py-14 sm:px-12 sm:py-16"
        id="main-content"
      >
        <Kicker>NextXI</Kicker>
        <h1 className="mt-3 font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] uppercase">
          {title}
        </h1>
        {intro && <p className="mt-4 max-w-[65ch] text-[15px] leading-relaxed">{intro}</p>}
        <div className="mt-9 grid gap-9">{children}</div>
      </main>
      <LandingFooter />
    </div>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl leading-tight font-semibold uppercase">{title}</h2>
      <div className="mt-3 grid max-w-[65ch] gap-3 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

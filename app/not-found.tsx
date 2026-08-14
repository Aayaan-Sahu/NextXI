import Link from "next/link";
import { Wordmark } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-cream-200">
      <header className="border-b-2 border-pitch-950/30 bg-rust-700 px-6 sm:px-12">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center">
          <Link className="no-underline" href="/">
            <Wordmark tone="dark" />
          </Link>
        </div>
      </header>
      <main
        className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center px-6 py-16"
        id="main-content"
      >
        <p className="font-mono text-[11px] font-semibold tracking-[.2em] text-rust-600 uppercase">
          404
        </p>
        <h1 className="mt-3 font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] uppercase">
          That page isn&apos;t here
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          The link may be old, or the address may have a typo. Head back to NextXI
          and start from the front.
        </p>
        <Link
          className="mt-8 w-fit rounded-md bg-rust-600 px-4 py-2.5 text-sm font-bold text-cream-50 no-underline hover:bg-rust-700"
          href="/"
        >
          Back to NextXI
        </Link>
      </main>
    </div>
  );
}

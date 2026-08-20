import Link from "next/link";
import { Wordmark, PageTitle } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-cream-200">
      <header className="bg-rust-600">
        <div className="mx-auto flex h-14 w-full max-w-[1360px] items-center px-6 sm:px-10">
          <Link className="no-underline" href="/">
            <Wordmark tone="dark" />
          </Link>
        </div>
      </header>
      <main
        className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center px-6 py-16"
        id="main-content"
      >
        <PageTitle>That page isn&apos;t here</PageTitle>
        <p className="mt-3 text-body leading-relaxed text-ink-800">
          The link may be old, or the address may have a typo. Head back to NextXI
          and start from the front.
        </p>
        <Link
          className="mt-7 w-fit rounded-md bg-gold-500 px-5 py-2.5 text-ui font-semibold text-ink-900 no-underline hover:bg-gold-600"
          href="/"
        >
          Back to NextXI
        </Link>
      </main>
    </div>
  );
}

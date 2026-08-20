import Link from "next/link";
import { Wordmark } from "@/components/ui";

/**
 * Menu bar above the seam-stitch hero. A darker rust than the hero plus a
 * hard bottom border keeps it reading as its own bar instead of bleeding
 * into the stitch pattern below.
 */
export function LandingNav() {
  return (
    <header className="border-b-2 border-pitch-950/30 bg-rust-700">
      <nav className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-6 px-6 sm:px-12">
        <Wordmark accent="peach" tone="dark" />
        <div className="flex items-center gap-6">
          <Link
            className="text-sm font-semibold text-sage-400 no-underline hover:text-cream-200"
            href="/auth"
          >
            Sign in
          </Link>
          <Link
            className="rounded-md bg-cream-50 px-4 py-2.5 text-sm font-bold text-rust-700 no-underline hover:bg-cream-100"
            href="/auth?mode=sign-up"
          >
            Create account
          </Link>
        </div>
      </nav>
    </header>
  );
}
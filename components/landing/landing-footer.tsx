import Link from "next/link";
import { Wordmark } from "@/components/ui";

export function LandingFooter() {
  return (
    <footer className="bg-pitch-950 px-6 py-10 sm:px-12">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 max-md:flex-col">
        <div className="flex flex-col gap-1 max-md:items-center">
          <Wordmark tone="dark" />
          <p className="text-[13px] text-cream-200/50">
            Cricket talent, seen properly.
          </p>
        </div>
        <nav className="flex items-center gap-6 text-sm font-semibold text-cream-200/70">
          <Link href="/auth" className="hover:text-gold-500">
            Sign in
          </Link>
          <a href="#waitlist" className="hover:text-gold-500">
            Join the waitlist
          </a>
          <span className="font-mono text-[11px] font-normal text-cream-200/40">
            © 2026 NextXI
          </span>
        </nav>
      </div>
    </footer>
  );
}

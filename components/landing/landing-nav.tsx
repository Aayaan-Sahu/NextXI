import Link from "next/link";
import { Wordmark } from "@/components/ui";

/** PrimaryButton styling on a link, for marketing CTAs. */
export function LinkButton({
  href,
  children,
  variant = "gold",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "gold" | "rust";
}) {
  return (
    <Link
      href={href}
      className={
        variant === "rust"
          ? "inline-block rounded-md bg-rust-600 px-4 py-2.5 text-sm font-bold text-cream-50 hover:bg-rust-700"
          : "inline-block rounded-md bg-gold-500 px-4 py-2.5 text-sm font-bold text-pitch-900 hover:bg-gold-600"
      }
    >
      {children}
    </Link>
  );
}

export function LandingNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-6 sm:px-12">
      <Wordmark tone="dark" />
      <nav className="flex items-center gap-5">
        <Link
          href="/auth"
          className="text-sm font-semibold text-cream-100 hover:text-gold-500"
        >
          Sign in
        </Link>
        <LinkButton href="/auth?mode=sign-up">Get started</LinkButton>
      </nav>
    </header>
  );
}

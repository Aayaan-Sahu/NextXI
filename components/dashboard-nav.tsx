"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/auth/actions";
import { Wordmark } from "@/components/ui";

const menuItemClasses =
  "block w-full cursor-pointer px-3 py-2 text-left text-sm text-ink-900 no-underline hover:bg-cream-200";

export function DashboardNav({
  avatarUrl = null,
  homeHref,
  initial,
  limited = false,
}: {
  avatarUrl?: string | null;
  homeHref: string;
  initial: string;
  limited?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Progress is a player-only surface; `homeHref` encodes the signed-in role.
  const isPlayer = homeHref === "/dashboard/player";

  const links = limited
    ? [{ href: homeHref, label: "Home" }]
    : [
        { href: homeHref, label: "Home" },
        ...(isPlayer
          ? [
              { href: "/dashboard/player/sessions", label: "Sessions" },
              { href: "/dashboard/progress", label: "Progress" },
            ]
          : []),
        { href: "/dashboard/connections", label: "Connections" },
        { href: "/dashboard/messages", label: "Messages" },
      ];

  // Most-specific match wins, so "Sessions" (not "Home") lights up under
  // /dashboard/player/sessions even though "Home" is a path prefix.
  const activeHref = links
    .filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))
    .reduce<string | null>(
      (best, link) => (!best || link.href.length > best.length ? link.href : best),
      null,
    );

  return (
    <header className="bg-rust-600">
      <nav className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-10 px-6 sm:px-12">
        <Link className="no-underline" href={homeHref}>
          <Wordmark tone="dark" />
        </Link>
        <div className="flex flex-1 items-center gap-7 self-stretch text-sm font-semibold">
          {links.map((link) => (
            <Link
              className={
                link.href === activeHref
                  ? "flex items-center self-stretch border-b-2 border-gold-500 text-cream-200 no-underline"
                  : "flex items-center self-stretch border-b-2 border-transparent text-sage-400 no-underline hover:text-cream-200"
              }
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="relative">
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex size-[34px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-gold-500 text-sm font-bold text-rust-600"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="size-full object-cover" src={avatarUrl} />
            ) : (
              initial
            )}
          </button>
          {menuOpen ? (
            <>
              <button
                aria-label="Close menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuOpen(false)}
                type="button"
              />
              <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-md border border-cream-400 bg-cream-50 py-1 shadow-md">
                {!limited && (
                  <Link
                    className={menuItemClasses}
                    href="/dashboard/profile"
                    onClick={() => setMenuOpen(false)}
                  >
                    Edit profile
                  </Link>
                )}
                <form action={signOut}>
                  <button className={menuItemClasses} type="submit">
                    Sign out
                  </button>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </nav>
    </header>
  );
}

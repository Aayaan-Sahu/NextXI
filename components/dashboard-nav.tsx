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
  unreadMessages = 0,
}: {
  avatarUrl?: string | null;
  homeHref: string;
  initial: string;
  limited?: boolean;
  unreadMessages?: number;
}) {
  const pathname = usePathname();
  // Two disclosures share the bar (nav links, account); opening one closes the
  // other so their backdrops and z-20 panels never stack.
  const [navOpen, setNavOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

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

  const badgeCount = unreadMessages > 99 ? "99+" : unreadMessages;
  const showBadge = (href: string) => href === "/dashboard/messages" && unreadMessages > 0;

  // Most-specific match wins, so "Sessions" (not "Home") lights up under
  // /dashboard/player/sessions even though "Home" is a path prefix.
  const activeHref = links
    .filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`))
    .reduce<string | null>(
      (best, link) => (!best || link.href.length > best.length ? link.href : best),
      null,
    );

  return (
    // `relative` anchors the mobile disclosure panel to the bar's bottom edge.
    // Gold stitch line under the rust band keeps brand from ending abruptly.
    <header className="relative border-b-2 border-gold-500 bg-rust-600">
      <nav className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-4 px-6 sm:px-12 md:gap-10">
        {/* A player's inline link row needs ~592px min-content (wordmark +
            five links + avatar), which fits the 672px md leaves after sm:px-12
            (768 - 96), so the row returns at md and only sub-md gets a
            disclosure menu. */}
        <button
          aria-expanded={navOpen}
          aria-label="Menu"
          className="relative -ml-3 flex size-11 shrink-0 cursor-pointer items-center justify-center text-cream-200 md:hidden"
          onClick={() => {
            setNavOpen((open) => !open);
            setAccountOpen(false);
          }}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            {navOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
          {unreadMessages > 0 && !navOpen ? (
            <span className="absolute top-0.5 right-0 rounded-full bg-gold-500 px-1.5 py-px text-[10px] leading-[14px] font-bold text-rust-700">
              {badgeCount}
            </span>
          ) : null}
        </button>
        {navOpen ? (
          <>
            <button
              aria-label="Close menu"
              className="fixed inset-0 z-10 cursor-default md:hidden"
              onClick={() => setNavOpen(false)}
              type="button"
            />
            <div className="absolute inset-x-0 top-full z-20 border-b border-cream-400 bg-cream-50 py-2 shadow-md md:hidden">
              {links.map((link) => (
                <Link
                  className={
                    link.href === activeHref
                      ? "block border-l-2 border-gold-500 bg-cream-200 px-6 py-3 text-sm font-semibold text-rust-600 no-underline sm:px-12"
                      : "block border-l-2 border-transparent px-6 py-3 text-sm font-semibold text-ink-900 no-underline hover:bg-cream-200 sm:px-12"
                  }
                  href={link.href}
                  key={link.href}
                  onClick={() => setNavOpen(false)}
                >
                  {link.label}
                  {showBadge(link.href) ? (
                    <span className="ml-2 inline-flex rounded-full bg-rust-600 px-2 py-0.5 text-[11px] font-bold text-cream-200">
                      {badgeCount}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </>
        ) : null}
        <Link className="no-underline" href={homeHref}>
          <Wordmark tone="dark" />
        </Link>
        <div className="hidden flex-1 items-center gap-7 self-stretch text-sm font-semibold md:flex">
          {links.map((link) => (
            <Link
              className={
                link.href === activeHref
                  ? "flex items-center gap-1.5 self-stretch border-b-2 border-gold-500 text-cream-200 no-underline"
                  : "flex items-center gap-1.5 self-stretch border-b-2 border-transparent text-sage-400 no-underline hover:text-cream-200"
              }
              href={link.href}
              key={link.href}
            >
              {link.label}
              {showBadge(link.href) ? (
                <span className="rounded-full bg-gold-500 px-1.5 py-px text-[10px] leading-[14px] font-bold text-rust-700">
                  {badgeCount}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
        {/* `ml-auto` keeps the avatar flush right on mobile, where no flex-1
            link row sits between it and the wordmark. */}
        <div className="relative ml-auto">
          <button
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            className="flex size-[34px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-gold-500 text-sm font-bold text-rust-600"
            onClick={() => {
              setAccountOpen((open) => !open);
              setNavOpen(false);
            }}
            type="button"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="size-full object-cover" src={avatarUrl} />
            ) : (
              initial
            )}
          </button>
          {accountOpen ? (
            <>
              <button
                aria-label="Close menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setAccountOpen(false)}
                type="button"
              />
              <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-md border border-cream-400 bg-cream-50 py-1 shadow-md">
                {!limited && (
                  <Link
                    className={menuItemClasses}
                    href="/dashboard/profile"
                    onClick={() => setAccountOpen(false)}
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

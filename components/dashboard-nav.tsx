"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/auth/actions";
import { Wordmark } from "@/components/ui";

export function DashboardNav({
  avatarUrl = null,
  homeHref,
  initial,
  limited = false,
  pendingReviews = 0,
  unreadMessages = 0,
}: {
  avatarUrl?: string | null;
  homeHref: string;
  initial: string;
  limited?: boolean;
  /** Reports awaiting a coach's sign-off — badged on their Home link. */
  pendingReviews?: number;
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

  // Messages carries unread DMs; a coach's Home carries reports awaiting
  // their sign-off. Anything else is quiet.
  const badgeFor = (href: string) =>
    href === "/dashboard/messages" ? unreadMessages : href === homeHref ? pendingReviews : 0;
  const badgeText = (count: number) => (count > 99 ? "99+" : count);
  const showBadge = (href: string) => badgeFor(href) > 0;

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
    <header className="relative bg-rust-600">
      <nav className="mx-auto flex h-14 w-full max-w-[1360px] items-stretch gap-4 px-6 sm:px-10 md:gap-8">
        {/* A player's inline link row needs ~592px min-content (wordmark +
            five links + avatar), which fits the 672px md leaves after sm:px-10,
            so the row returns at md and only sub-md gets a disclosure menu. */}
        <button
          aria-expanded={navOpen}
          aria-label="Menu"
          className="relative -ml-3 flex w-11 shrink-0 cursor-pointer items-center justify-center text-cream-200 md:hidden"
          onClick={() => {
            setNavOpen((open) => !open);
            setAccountOpen(false);
          }}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="size-[18px]"
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
          {/* The unread dot rides the closed hamburger. */}
          {(unreadMessages > 0 || pendingReviews > 0) && !navOpen ? (
            <span className="absolute top-3 right-1.5 size-[7px] rounded-full bg-amber-500" />
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
            <div className="absolute inset-x-0 top-full z-20 bg-pitch-900 p-2 md:hidden">
              {links.map((link) => (
                <Link
                  className={
                    link.href === activeHref
                      ? "flex items-center justify-between rounded-md bg-amber-500/[.14] px-3.5 py-2.5 text-ui font-semibold text-cream-50 no-underline shadow-[inset_2px_0_0_var(--color-amber-500)]"
                      : "flex items-center justify-between rounded-md px-3.5 py-2.5 text-ui text-cream-200/70 no-underline hover:text-cream-50"
                  }
                  href={link.href}
                  key={link.href}
                  onClick={() => setNavOpen(false)}
                >
                  {link.label}
                  {showBadge(link.href) ? (
                    <span className="rounded-[9px] bg-amber-500 px-1.5 py-px text-micro font-bold text-ink-900">
                      {badgeText(badgeFor(link.href))}
                    </span>
                  ) : null}
                </Link>
              ))}
              <div className="mt-1.5 border-t border-cream-200/[.14] pt-1.5">
                {!limited && (
                  <Link
                    className="block px-3.5 py-2.5 text-ui text-cream-200/70 no-underline hover:text-cream-50"
                    href="/dashboard/profile"
                    onClick={() => setNavOpen(false)}
                  >
                    Edit profile
                  </Link>
                )}
                <form action={signOut}>
                  <button
                    className="w-full cursor-pointer px-3.5 py-2.5 text-left text-ui font-semibold text-gold-500"
                    type="submit"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : null}
        <Link className="flex items-center no-underline" href={homeHref}>
          <Wordmark tone="dark" />
        </Link>
        <div className="hidden flex-1 items-stretch gap-[22px] text-ui md:flex">
          {links.map((link) => (
            <Link
              className={
                link.href === activeHref
                  ? "flex items-center gap-[7px] font-semibold text-cream-50 no-underline shadow-[inset_0_-2px_0_var(--color-amber-500)]"
                  : "flex items-center gap-[7px] text-cream-200/[.66] no-underline hover:text-cream-50"
              }
              href={link.href}
              key={link.href}
            >
              {link.label}
              {showBadge(link.href) ? (
                <span className="rounded-[9px] bg-amber-500 px-1.5 py-px text-micro font-bold text-ink-900">
                  {badgeText(badgeFor(link.href))}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
        {/* `ml-auto` keeps the avatar flush right on mobile, where no flex-1
            link row sits between it and the wordmark. */}
        <div className="relative ml-auto flex items-center">
          <button
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            className="flex size-[30px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-gold-500 text-caption font-bold text-ink-900"
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
              <div className="absolute top-full right-0 z-20 mt-2 w-44 overflow-hidden rounded-md bg-pitch-900 py-1.5">
                {!limited && (
                  <Link
                    className="block px-3.5 py-2 text-ui text-cream-200/70 no-underline hover:text-cream-50"
                    href="/dashboard/profile"
                    onClick={() => setAccountOpen(false)}
                  >
                    Edit profile
                  </Link>
                )}
                <form action={signOut}>
                  <button
                    className="w-full cursor-pointer px-3.5 py-2 text-left text-ui font-semibold text-gold-500"
                    type="submit"
                  >
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

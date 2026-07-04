"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/auth/actions";

const menuItemClasses =
  "block w-full cursor-pointer px-3 py-2 text-left text-sm text-neutral-950 no-underline hover:bg-stone-100";

export function DashboardNav({
  homeHref,
  initial,
  limited = false,
}: {
  homeHref: string;
  initial: string;
  limited?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = limited
    ? [{ href: homeHref, label: "Home" }]
    : [
        { href: homeHref, label: "Home" },
        { href: "/dashboard/connections", label: "Connections" },
        { href: "/dashboard/messages", label: "Messages" },
      ];

  return (
    <header className="border-b border-stone-300 bg-white">
      <nav className="mx-auto flex w-full max-w-[960px] items-center gap-6 px-6 py-3">
        <Link className="font-semibold text-neutral-950 no-underline" href={homeHref}>
          Cricket Platform
        </Link>
        <div className="flex flex-1 items-center gap-4 text-sm">
          {links.map((link) => (
            <Link
              className={
                pathname.startsWith(link.href)
                  ? "font-semibold text-neutral-950 no-underline"
                  : "text-stone-600 no-underline hover:text-neutral-950"
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
            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {initial}
          </button>
          {menuOpen ? (
            <>
              <button
                aria-label="Close menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuOpen(false)}
                type="button"
              />
              <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-md border border-stone-300 bg-white py-1 shadow-md">
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

"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Two-pane chrome for the messages surface. At md+ the conversation list and
 * thread sit side by side; below md only one pane fits, so the route decides
 * which shows — the list on the index, the thread elsewhere. Layouts can't
 * read the route on the server, hence this client shell.
 */
export function MessagesShell({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar: ReactNode;
}) {
  const pathname = usePathname();
  const threadOpen = pathname.startsWith("/dashboard/messages/");

  return (
    <main className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-[1280px] overflow-hidden border-cream-400 bg-cream-200 sm:border-x">
      {sidebar}
      <section
        className={`min-w-0 flex-1 flex-col bg-cream-50 ${
          threadOpen ? "flex" : "hidden md:flex"
        }`}
      >
        {children}
      </section>
    </main>
  );
}

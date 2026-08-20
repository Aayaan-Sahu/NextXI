"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Three-part chrome for the messages surface: a page header, then the list and
 * the thread side by side. Below md only one pane fits, so the route decides
 * which shows — the list on the index, the thread elsewhere. Layouts can't
 * read the route on the server, hence this client shell.
 */
export function MessagesShell({
  children,
  header,
  sidebar,
}: {
  children: ReactNode;
  header: ReactNode;
  sidebar: ReactNode;
}) {
  const pathname = usePathname();
  const threadOpen = pathname.startsWith("/dashboard/messages/");

  return (
    <main
      className="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-[1360px] flex-col"
      id="main-content"
    >
      <div className={`px-6 pt-6 pb-5 sm:px-10 ${threadOpen ? "max-md:hidden" : ""}`}>
        {header}
      </div>
      <div className="flex min-h-0 flex-1 border-t border-cream-400">
        {sidebar}
        <section
          className={`min-w-0 flex-1 flex-col bg-cream-50 ${
            threadOpen ? "flex" : "hidden md:flex"
          }`}
        >
          {children}
        </section>
      </div>
    </main>
  );
}

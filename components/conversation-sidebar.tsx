"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { ConversationSummary } from "@/lib/messages";
import { Kicker } from "@/components/ui";

/** True when the query's characters appear in order within the target. */
function fuzzyMatch(query: string, target: string) {
  const characters = query.toLowerCase().replace(/\s/g, "");
  let matched = 0;

  for (const char of target.toLowerCase()) {
    if (char === characters[matched]) matched++;
  }

  return matched === characters.length;
}

export function ConversationSidebar({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  const { connectionId } = useParams<{ connectionId?: string }>();
  const [query, setQuery] = useState("");
  const InboxHeading = connectionId ? "h2" : "h1";

  const trimmed = query.trim();
  const visible = trimmed
    ? conversations.filter(
        (conversation) =>
          fuzzyMatch(trimmed, conversation.counterpart.name) ||
          fuzzyMatch(trimmed, conversation.counterpart.username ?? ""),
      )
    : conversations;

  const unreadTotal = conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0,
  );
  const stats = [
    `${conversations.length} thread${conversations.length === 1 ? "" : "s"}`,
    unreadTotal > 0
      ? `${unreadTotal} unread`
      : conversations.length
        ? "All caught up"
        : "No threads yet",
  ];

  // Single pane below md: the list fills the screen on the index and hides
  // while a thread is open (MessagesShell swaps in the thread pane there).
  return (
    <aside
      className={`flex w-full flex-col border-cream-400 bg-cream-100 md:w-[22rem] md:shrink-0 md:border-r ${
        connectionId ? "max-md:hidden" : ""
      }`}
    >
      <div className="border-b border-cream-400 bg-cream-100/80 px-4 py-5 md:px-5">
        <Kicker>Messages</Kicker>
        {/* One h1 per state: on the index this list IS the page, but with a
            thread open the counterpart's name is the h1 and this demotes. */}
        <InboxHeading className="mt-2 font-display text-[26px] leading-[1.05] font-bold tracking-[.02em] uppercase text-ink-900">
          Inbox
        </InboxHeading>
        <p className="mt-2.5 font-mono text-[11.5px] text-ink-600">
          {stats.join(" · ")}
        </p>
        <input
          className="mt-4 w-full rounded-md border border-cream-400 bg-cream-50 px-3 py-2 text-base text-ink-900 placeholder:text-sage-400 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25 focus:outline-none md:text-[13.5px]"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          type="search"
          value={query}
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {visible.map((conversation) => {
          const active = conversation.connectionId === connectionId;

          return (
            <li key={conversation.connectionId}>
              <Link
                className={`flex items-center gap-3 border-l-[3px] px-4 py-3.5 no-underline md:px-5 ${
                  active
                    ? "border-gold-500 bg-white"
                    : "border-transparent hover:bg-cream-50"
                }`}
                href={`/dashboard/messages/${conversation.connectionId}`}
              >
                <span
                  className={`flex size-[38px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${
                    active ? "bg-pitch-900 text-gold-500" : "bg-pitch-800 text-cream-200"
                  }`}
                >
                  {conversation.counterpart.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink-900">
                    {conversation.counterpart.name}
                  </span>
                  <span
                    className={`block truncate text-[12.5px] ${
                      conversation.lastMessage ? "text-ink-600" : "text-sage-400"
                    }`}
                  >
                    {conversation.lastMessage
                      ? `${conversation.lastMessage.fromMe ? "You: " : ""}${conversation.lastMessage.body}`
                      : "No messages yet."}
                  </span>
                </span>
                {conversation.unreadCount > 0 ? (
                  <span className="shrink-0 rounded-full bg-rust-600 px-2 py-0.5 text-[11px] font-bold text-cream-200">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
        {!visible.length ? (
          <li className="px-4 py-6 text-sm text-ink-600 md:px-5">
            {conversations.length
              ? "No connections match your search."
              : "No conversations yet. Connect with someone to start messaging."}
          </li>
        ) : null}
      </ul>
    </aside>
  );
}

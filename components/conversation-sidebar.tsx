"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PersonAvatar } from "@/components/connections";
import type { ConversationSummary } from "@/lib/messages";

/** True when the query's characters appear in order within the target. */
function fuzzyMatch(query: string, target: string) {
  const characters = query.toLowerCase().replace(/\s/g, "");
  let matched = 0;

  for (const char of target.toLowerCase()) {
    if (char === characters[matched]) matched++;
  }

  return matched === characters.length;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Inbox timestamps compress as they age: a clock today, a weekday this week,
 * then a date. The row has one line for this, so it never wraps.
 */
function inboxTime(iso: string) {
  const date = new Date(iso);
  const age = Date.now() - date.getTime();

  if (age < DAY_MS && new Date().getDate() === date.getDate()) {
    return date
      .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })
      .replace(/\s?([ap])m$/i, "$1");
  }
  if (age < 6 * DAY_MS) return date.toLocaleDateString("en-GB", { weekday: "short" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function ConversationSidebar({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  const { connectionId } = useParams<{ connectionId?: string }>();
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const visible = trimmed
    ? conversations.filter(
        (conversation) =>
          fuzzyMatch(trimmed, conversation.counterpart.name) ||
          fuzzyMatch(trimmed, conversation.counterpart.username ?? ""),
      )
    : conversations;

  // Single pane below md: the list fills the screen on the index and hides
  // while a thread is open (MessagesShell swaps in the thread pane there).
  return (
    <aside
      className={`w-full shrink-0 overflow-y-auto border-cream-400 bg-cream-100 p-2 md:w-[320px] md:border-r ${
        connectionId ? "max-md:hidden" : ""
      }`}
    >
      <input
        className="mb-1 w-full rounded-md border border-cream-400 bg-cream-50 px-3 py-2 text-base text-ink-900 placeholder:text-ink-600 focus:border-ink-900 focus:ring-2 focus:ring-amber-500/30 focus:outline-none md:text-ui"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search conversations"
        type="search"
        value={query}
      />
      <ul>
        {visible.map((conversation) => {
          const active = conversation.connectionId === connectionId;

          return (
            <li key={conversation.connectionId}>
              <Link
                className={`flex gap-3 rounded-lg p-3 no-underline ${
                  active
                    ? "bg-cream-50 shadow-[inset_3px_0_0_var(--color-rust-600)]"
                    : "hover:bg-cream-50/70"
                }`}
                href={`/dashboard/messages/${conversation.connectionId}`}
              >
                <PersonAvatar
                  name={conversation.counterpart.name}
                  role={conversation.counterpart.role}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <span className="truncate text-ui font-semibold text-ink-900">
                      {conversation.counterpart.name}
                    </span>
                    <span className="shrink-0 text-caption text-ink-600">
                      {conversation.lastMessage
                        ? inboxTime(conversation.lastMessage.createdAt)
                        : ""}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-caption text-ink-600">
                    {conversation.lastMessage
                      ? `${conversation.lastMessage.fromMe ? "You: " : ""}${conversation.lastMessage.body}`
                      : "No messages yet."}
                  </span>
                </span>
                {conversation.unreadCount > 0 ? (
                  <span className="mt-0.5 h-fit shrink-0 rounded-[9px] bg-rust-600 px-1.5 py-px text-micro font-semibold text-cream-50">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
        {!visible.length ? (
          <li className="px-3 py-6 text-ui text-ink-600">
            {conversations.length
              ? "No connections match your search."
              : "No conversations yet. Connect with someone to start messaging."}
          </li>
        ) : null}
      </ul>
    </aside>
  );
}

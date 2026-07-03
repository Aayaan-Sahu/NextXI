"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
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

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-stone-300 max-md:w-52">
      <div className="border-b border-stone-300 p-3">
        <input
          className="w-full rounded-full border border-stone-300 bg-stone-100 px-3.5 py-1.5 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none"
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
                className={`flex items-center gap-3 px-3 py-2.5 no-underline hover:bg-stone-50 ${
                  active ? "bg-stone-100" : ""
                }`}
                href={`/dashboard/messages/${conversation.connectionId}`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
                  {conversation.counterpart.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-950">
                    {conversation.counterpart.name}
                  </span>
                  <span className="block truncate text-xs text-stone-600">
                    {conversation.lastMessage
                      ? `${conversation.lastMessage.fromMe ? "You: " : ""}${conversation.lastMessage.body}`
                      : "No messages yet."}
                  </span>
                </span>
                {conversation.unreadCount > 0 ? (
                  <span className="shrink-0 rounded-full bg-neutral-950 px-2 py-0.5 text-xs font-semibold text-white">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
        {!visible.length ? (
          <li className="p-4 text-sm text-stone-600">
            {conversations.length
              ? "No connections match your search."
              : "No conversations yet. Connect with someone to start messaging."}
          </li>
        ) : null}
      </ul>
    </aside>
  );
}

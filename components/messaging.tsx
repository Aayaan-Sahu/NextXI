"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/app/dashboard/messages/actions";
import type { ThreadMessage } from "@/lib/messages";
import { PrimaryButton } from "@/components/ui";

const POLL_INTERVAL_MS = 5000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export function MessageThread({
  connectionId,
  messages,
}: {
  connectionId: string;
  messages: ThreadMessage[];
}) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Light polling: pull new messages without any realtime infrastructure.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="grid gap-4">
      <div className="grid max-h-[60vh] gap-2 overflow-y-auto rounded-lg border border-stone-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        {messages.length ? (
          messages.map((message) => (
            <div
              className={message.fromMe ? "justify-self-end text-right" : "justify-self-start"}
              key={message.id}
            >
              <div
                className={
                  message.fromMe
                    ? "inline-block max-w-[80%] rounded-lg bg-neutral-950 px-3 py-2 text-sm text-white dark:bg-neutral-50 dark:text-neutral-950"
                    : "inline-block max-w-[80%] rounded-lg bg-stone-100 px-3 py-2 text-sm text-neutral-950 dark:bg-neutral-800 dark:text-neutral-50"
                }
              >
                <p className="m-0 whitespace-pre-wrap break-words">{message.body}</p>
              </div>
              <p className="mt-1 text-[11px] text-stone-600 dark:text-neutral-400">
                {formatTime(message.createdAt)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-stone-600 dark:text-neutral-300">
            No messages yet. Say hello.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form action={sendMessage} className="grid gap-3">
        <input name="connectionId" type="hidden" value={connectionId} />
        <textarea
          className="resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-neutral-950 focus:border-neutral-950 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-50 dark:focus:ring-neutral-600"
          maxLength={4000}
          name="body"
          placeholder="Write a message"
          required
          rows={3}
        />
        <div className="justify-self-end">
          <PrimaryButton type="submit">Send</PrimaryButton>
        </div>
      </form>
    </div>
  );
}

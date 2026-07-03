"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { markThreadRead, sendMessage } from "@/app/dashboard/messages/actions";
import type { ThreadMessage } from "@/lib/messages";
import { useMessageChanges, type MessageChange } from "@/components/messages-realtime";
import { PrimaryButton } from "@/components/ui";

/** Gap between messages after which a timestamp divider is shown. */
const TIME_DIVIDER_GAP_MS = 15 * 60 * 1000;

function formatDivider(iso: string) {
  return new Date(iso).toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toThreadMessage(change: MessageChange, currentUserId: string): ThreadMessage {
  return {
    id: change.message.id,
    body: change.message.body,
    createdAt: change.message.createdAt,
    fromMe: change.message.senderId === currentUserId,
    readAt: change.message.readAt,
  };
}

/**
 * Receipt shown under the most recent own message only — earlier messages
 * never carry one, matching standard messaging conventions.
 */
function receiptFor(message: ThreadMessage, isPending: boolean) {
  if (isPending) return "Sending…";
  if (message.readAt) return `Read ${formatClock(message.readAt)}`;
  return "Sent";
}

export function MessageThread({
  connectionId,
  currentUserId,
  initialMessages,
}: {
  connectionId: string;
  currentUserId: string;
  initialMessages: ThreadMessage[];
}) {
  // Server-rendered messages plus everything that arrived over the websocket
  // or was sent locally; `live` entries win over stale server props.
  const [live, setLive] = useState<ThreadMessage[]>([]);
  const [pendingSends, setPendingSends] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startSending] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingCounter = useRef(0);

  const messages = useMemo(() => {
    const byId = new Map<string, ThreadMessage>();
    for (const message of [...initialMessages, ...live]) byId.set(message.id, message);
    return [...byId.values(), ...pendingSends].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }, [initialMessages, live, pendingSends]);

  useMessageChanges(connectionId, (change) => {
    const message = toThreadMessage(change, currentUserId);
    setLive((previous) => [...previous.filter((m) => m.id !== message.id), message]);
  });

  // Send read receipts when the conversation is actually being viewed: on
  // open, when new messages arrive, and when the tab regains focus.
  const hasUnreadIncoming = messages.some((message) => !message.fromMe && !message.readAt);
  useEffect(() => {
    if (!hasUnreadIncoming) return;

    const markRead = () => {
      if (document.visibilityState !== "visible") return;
      void markThreadRead(connectionId);
    };

    markRead();
    document.addEventListener("visibilitychange", markRead);
    window.addEventListener("focus", markRead);
    return () => {
      document.removeEventListener("visibilitychange", markRead);
      window.removeEventListener("focus", markRead);
    };
  }, [hasUnreadIncoming, connectionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || body.length > 4000) return;

    const temporaryId = `pending-${++pendingCounter.current}`;
    setPendingSends((previous) => [
      ...previous,
      {
        id: temporaryId,
        body,
        createdAt: new Date().toISOString(),
        fromMe: true,
        readAt: null,
      },
    ]);
    setDraft("");
    setError(null);

    startSending(async () => {
      const result = await sendMessage(connectionId, body);
      setPendingSends((previous) => previous.filter((m) => m.id !== temporaryId));
      if (result.ok) {
        setLive((previous) =>
          previous.some((m) => m.id === result.message.id)
            ? previous
            : [...previous, result.message],
        );
      } else {
        setError(result.error);
        setDraft((current) => current || body);
      }
    });
  }

  let lastOwnId: string | undefined;
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].fromMe) {
      lastOwnId = messages[index].id;
      break;
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
        {messages.length ? (
          messages.map((message, index) => {
            const previous = messages[index - 1];
            const showDivider =
              !previous ||
              new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() >
                TIME_DIVIDER_GAP_MS;
            const isPending = message.id.startsWith("pending-");

            return (
              <div className="flex flex-col gap-2" key={message.id}>
                {showDivider ? (
                  <p className="my-1 text-center text-[11px] text-stone-600 dark:text-neutral-400">
                    {formatDivider(message.createdAt)}
                  </p>
                ) : null}
                <div className={message.fromMe ? "self-end text-right" : "self-start"}>
                  <div
                    className={
                      message.fromMe
                        ? "inline-block max-w-[420px] rounded-lg bg-neutral-950 px-3 py-2 text-sm text-white dark:bg-neutral-50 dark:text-neutral-950"
                        : "inline-block max-w-[420px] rounded-lg bg-stone-100 px-3 py-2 text-sm text-neutral-950 dark:bg-neutral-800 dark:text-neutral-50"
                    }
                    title={formatDivider(message.createdAt)}
                  >
                    <p className="m-0 whitespace-pre-wrap break-words">{message.body}</p>
                  </div>
                  {message.id === lastOwnId ? (
                    <p className="mt-1 text-[11px] text-stone-600 dark:text-neutral-400">
                      {receiptFor(message, isPending)}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-stone-600 dark:text-neutral-300">
            No messages yet. Say hello.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-neutral-950 dark:border-red-800 dark:bg-red-950/40 dark:text-neutral-50">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-stone-300 p-3 dark:border-neutral-700"
      >
        <input
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-neutral-950 focus:border-neutral-950 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-50"
          maxLength={4000}
          name="body"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message..."
          required
          type="text"
          value={draft}
        />
        <PrimaryButton type="submit">Send</PrimaryButton>
      </form>
    </>
  );
}

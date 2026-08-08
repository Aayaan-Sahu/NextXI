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
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-cream-50 p-4 md:p-6">
        {messages.length ? (
          messages.map((message, index) => {
            const previous = messages[index - 1];
            const showDivider =
              !previous ||
              new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() >
                TIME_DIVIDER_GAP_MS;
            const isPending = message.id.startsWith("pending-");

            return (
              <div className="flex flex-col gap-3" key={message.id}>
                {showDivider ? (
                  <p className="my-1 text-center font-mono text-[11px] text-sage-400">
                    {formatDivider(message.createdAt)}
                  </p>
                ) : null}
                <div
                  className={
                    message.fromMe
                      ? "max-w-[85%] self-end text-right md:max-w-[60%]"
                      : "max-w-[85%] self-start md:max-w-[60%]"
                  }
                >
                  <div
                    className={
                      message.fromMe
                        ? "inline-block rounded-[14px] rounded-br-[4px] bg-rust-600 px-3.5 py-2.5 text-left text-sm leading-[1.55] text-cream-200"
                        : "inline-block rounded-[14px] rounded-bl-[4px] border border-cream-400 bg-white px-3.5 py-2.5 text-left text-sm leading-[1.55] text-ink-900"
                    }
                    title={formatDivider(message.createdAt)}
                  >
                    <p className="m-0 whitespace-pre-wrap break-words">{message.body}</p>
                  </div>
                  {message.id === lastOwnId ? (
                    <p className="mt-1 font-mono text-[10.5px] text-sage-400">
                      {receiptFor(message, isPending)}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="m-auto max-w-xs rounded-[10px] border border-dashed border-cream-500 bg-cream-100/60 px-5 py-8 text-center">
            <p className="text-sm text-ink-600">No messages yet. Say hello.</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="border-t border-rust-600/30 bg-rust-600/10 px-4 py-2 text-sm text-rust-700 md:px-6">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 border-t border-cream-400 bg-white px-4 py-3 md:px-6 md:py-4"
      >
        <input
          autoComplete="off"
          className="min-w-0 flex-1 rounded-md border border-cream-500 bg-cream-50 px-3.5 py-2.5 text-base text-ink-900 placeholder:text-sage-400 focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25 focus:outline-none md:text-sm"
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

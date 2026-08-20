"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { markThreadRead, sendMessage } from "@/app/dashboard/messages/actions";
import type { ThreadMessage } from "@/lib/messages";
import { PersonAvatar } from "@/components/connections";
import { useMessageChanges, type MessageChange } from "@/components/messages-realtime";
import { PrimaryButton } from "@/components/ui";

/** Gap between messages after which a timestamp divider is shown. */
const TIME_DIVIDER_GAP_MS = 15 * 60 * 1000;
/** Gap after which a run of messages from one person starts a new group. */
const GROUP_GAP_MS = 5 * 60 * 1000;

function formatDivider(iso: string) {
  const date = new Date(iso);
  const today = new Date().toDateString() === date.toDateString();
  const day = today
    ? "Today"
    : date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  return `${day} · ${date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}`;
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
  counterpartName,
  counterpartRole,
  currentUserId,
  initialMessages,
  selfName,
}: {
  connectionId: string;
  counterpartName: string;
  counterpartRole: string | null;
  currentUserId: string;
  initialMessages: ThreadMessage[];
  selfName: string;
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
      <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto bg-cream-50 px-4 py-5 md:px-6">
        {messages.length ? (
          messages.map((message, index) => {
            const previous = messages[index - 1];
            const gap = previous
              ? new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime()
              : Infinity;
            const showDivider = gap > TIME_DIVIDER_GAP_MS;
            // A run from one person reads as one utterance: the avatar and
            // name appear once, then the lines stack under them.
            const startsGroup =
              showDivider || !previous || previous.fromMe !== message.fromMe || gap > GROUP_GAP_MS;
            const isPending = message.id.startsWith("pending-");

            return (
              <div className="flex flex-col gap-[18px]" key={message.id}>
                {showDivider ? (
                  <div aria-hidden className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-cream-400" />
                    <span className="text-caption text-ink-600">
                      {formatDivider(message.createdAt)}
                    </span>
                    <span className="h-px flex-1 bg-cream-400" />
                  </div>
                ) : null}
                <div className={startsGroup ? "flex gap-3" : "flex gap-3 -mt-[18px]"}>
                  {startsGroup ? (
                    <PersonAvatar
                      name={message.fromMe ? selfName : counterpartName}
                      role={message.fromMe ? "self" : counterpartRole}
                      size="sm"
                    />
                  ) : (
                    <span aria-hidden className="w-[34px] shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    {startsGroup ? (
                      <p className="text-ui font-semibold text-ink-900">
                        {message.fromMe ? selfName : counterpartName}
                      </p>
                    ) : null}
                    <p
                      className="mt-0.5 text-body leading-relaxed break-words whitespace-pre-wrap text-ink-900"
                      title={formatDivider(message.createdAt)}
                    >
                      {message.body}
                    </p>
                    {message.id === lastOwnId ? (
                      <p className="mt-1 text-caption text-ink-600">
                        {receiptFor(message, isPending)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="m-auto max-w-xs rounded-lg border border-dashed border-cream-500 bg-cream-100 px-5 py-6 text-center">
            <p className="text-ui text-ink-800">No messages yet. Say hello.</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="border-t border-l-[3px] border-t-cream-400 border-l-rust-600 bg-rust-50 px-4 py-2.5 text-ui text-rust-800 md:px-6">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 border-t border-cream-400 bg-cream-100 px-4 py-3.5 md:px-6"
      >
        <input
          autoComplete="off"
          className="min-w-0 flex-1 rounded-md border border-cream-400 bg-cream-50 px-3.5 py-2.5 text-base text-ink-900 placeholder:text-ink-600 focus:border-ink-900 focus:ring-2 focus:ring-amber-500/30 focus:outline-none md:text-body"
          maxLength={4000}
          name="body"
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${counterpartName}`}
          required
          type="text"
          value={draft}
        />
        <PrimaryButton type="submit">Send</PrimaryButton>
      </form>
    </>
  );
}

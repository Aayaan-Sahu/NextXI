import type { ConversationSummary, Thread, ThreadMessage } from "@/lib/queries";

/**
 * The reconciliation rules for messaging, as pure functions over the React
 * Query caches.
 *
 * Three sources describe the same conversation and can arrive in any order: an
 * optimistic bubble written when you hit Send, the POST response, and the
 * websocket broadcast the DB trigger publishes. Keeping the merge rules here —
 * with no React, React Native or supabase import — is what lets `bun test`
 * cover the races that are otherwise only reachable with two devices and bad
 * timing.
 *
 * The type import is erased at runtime, so the cycle with queries.ts is a
 * compile-time one only.
 */

/** Row payload from `realtime.broadcast_changes` — snake_case DB columns. */
export type MessageRow = {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type BroadcastChange = { operation: "INSERT" | "UPDATE"; row: MessageRow };

function toIso(value: string | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}

/**
 * Postgres hands realtime `2026-09-05 10:00:00+00`, not an ISO string, and
 * `needsDivider` / `formatDayDivider` do date arithmetic on whatever they get.
 */
export function toThreadMessage(row: MessageRow, userId: string): ThreadMessage {
  return {
    id: row.id,
    body: row.body,
    createdAt: toIso(row.created_at) ?? row.created_at,
    fromMe: row.sender_id === userId,
    readAt: toIso(row.read_at),
  };
}

/** Ascending by time, with `id` as the tiebreaker so a shared millisecond still orders stably. */
function byCreatedAt(a: ThreadMessage, b: ThreadMessage): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function same(a: ThreadMessage, b: ThreadMessage): boolean {
  return (
    a.body === b.body &&
    a.createdAt === b.createdAt &&
    a.readAt === b.readAt &&
    a.fromMe === b.fromMe &&
    a.status === b.status
  );
}

/**
 * Upsert by `id`, returning the *same array reference* when nothing actually
 * changed. That identity is load-bearing: marking a thread read fires one
 * broadcast per row (`markConversationRead` is an `updateMany`), and the ones
 * that carry no new information have to cost nothing rather than re-render an
 * inverted FlatList mid-transition.
 */
export function upsertMessages(list: ThreadMessage[], incoming: ThreadMessage[]): ThreadMessage[] {
  let changed = false;
  const next = [...list];

  for (const message of incoming) {
    const index = next.findIndex((existing) => existing.id === message.id);
    if (index === -1) {
      next.push(message);
      changed = true;
    } else if (!same(next[index], message)) {
      next[index] = message;
      changed = true;
    }
  }

  return changed ? next.sort(byCreatedAt) : list;
}

let pendingCounter = 0;

/**
 * Random suffix, not just a counter: a counter resets when the screen unmounts
 * while a failed bubble stays in the cache for the query's gc window, and two
 * live rows sharing a key breaks FlatList recycling.
 */
export function newPendingId(): string {
  pendingCounter += 1;
  return `pending-${pendingCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * A pending bubble's timestamp, clamped to sit after everything already in the
 * thread. Device clocks drift: one running a minute slow would otherwise sort
 * your own message above the reply you are answering, and one running fast
 * would inject a day divider above it — both of which then jump when the
 * server's `createdAt` arrives.
 */
export function pendingCreatedAt(messages: ThreadMessage[]): string {
  const newest = messages.length
    ? new Date(messages[messages.length - 1].createdAt).getTime()
    : 0;
  return new Date(Math.max(Date.now(), newest + 1)).toISOString();
}

export function insertPending(thread: Thread | undefined, pending: ThreadMessage): Thread | undefined {
  if (!thread) return thread;
  return { ...thread, messages: [...thread.messages, pending] };
}

export function removeMessage(thread: Thread | undefined, id: string): Thread | undefined {
  if (!thread) return thread;
  const messages = thread.messages.filter((message) => message.id !== id);
  if (messages.length === thread.messages.length) return thread;
  return { ...thread, messages };
}

export function setMessageStatus(
  thread: Thread | undefined,
  id: string,
  status: ThreadMessage["status"],
): Thread | undefined {
  if (!thread) return thread;
  const index = thread.messages.findIndex((message) => message.id === id);
  if (index === -1) return thread;
  const messages = [...thread.messages];
  messages[index] = { ...messages[index], status };
  return { ...thread, messages };
}

/** Swap a confirmed server message in for the optimistic bubble that stood in for it. */
export function replacePending(
  thread: Thread | undefined,
  tempId: string,
  message: ThreadMessage,
): Thread | undefined {
  if (!thread) return thread;
  const withoutTemp = thread.messages.filter((existing) => existing.id !== tempId);
  return { ...thread, messages: upsertMessages(withoutTemp, [message]) };
}

/**
 * Apply a batch of broadcasts to one thread.
 *
 * Two rules earn their keep here:
 *
 * An `UPDATE` only ever writes `readAt`, and a device renders a receipt only
 * under *its own* last message — so an update to someone else's message is
 * inert and is dropped before it can cost a render.
 *
 * An own `INSERT` retires the oldest still-`sending` bubble. Echoes of your own
 * writes arrive on a single ordered channel in the order the rows were written,
 * which is the order this device sent them, so the oldest pending bubble is the
 * one each echo confirms. Correlating by position rather than by body is what
 * keeps two identical messages sent back to back from retiring each other's
 * bubble — and it converges on the same server row whether the echo or the POST
 * response wins the race.
 */
export function applyBroadcasts(
  thread: Thread | undefined,
  changes: BroadcastChange[],
  userId: string,
): Thread | undefined {
  if (!thread) return thread;

  const incoming: ThreadMessage[] = [];
  let retire = 0;

  for (const { operation, row } of changes) {
    const message = toThreadMessage(row, userId);
    if (operation === "UPDATE" && !message.fromMe) continue;
    if (operation === "INSERT" && message.fromMe) retire += 1;
    incoming.push(message);
  }

  if (!incoming.length) return thread;

  let messages = thread.messages;
  if (retire) {
    const survivors = [...messages];
    for (let i = 0; i < retire; i += 1) {
      const index = survivors.findIndex((message) => message.status === "sending");
      if (index === -1) break;
      survivors.splice(index, 1);
    }
    messages = survivors;
  }

  const next = upsertMessages(messages, incoming);
  return next === thread.messages ? thread : { ...thread, messages: next };
}

/**
 * Move a conversation to the top of the inbox with a new preview.
 *
 * Returns `null` when the connection is not in the list yet — a broadcast row
 * carries no counterpart name, role or username, so there is nothing to build a
 * summary from. The caller invalidates instead of inventing one. This is the
 * case that matters for a first-ever message, since the inbox is fetched with
 * `withMessagesOnly: true` and so omits connections nobody has written to.
 */
export function patchConversation(
  list: ConversationSummary[],
  connectionId: string,
  lastMessage: ConversationSummary["lastMessage"],
  unreadDelta: number,
): ConversationSummary[] | null {
  const index = list.findIndex((conversation) => conversation.connectionId === connectionId);
  if (index === -1) return null;

  const current = list[index];
  const next = [...list];
  next.splice(index, 1);
  next.unshift({
    ...current,
    lastMessage,
    unreadCount: Math.max(0, current.unreadCount + unreadDelta),
  });
  return next;
}

/** Zero a conversation's unread count — the tab badge reads this cache directly. */
export function clearUnread(
  list: ConversationSummary[],
  connectionId: string,
): ConversationSummary[] {
  const index = list.findIndex((conversation) => conversation.connectionId === connectionId);
  if (index === -1 || list[index].unreadCount === 0) return list;

  const next = [...list];
  next[index] = { ...next[index], unreadCount: 0 };
  return next;
}

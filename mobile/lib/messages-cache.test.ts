import { describe, expect, test } from "bun:test";
import {
  applyBroadcasts,
  clearUnread,
  newPendingId,
  patchConversation,
  pendingCreatedAt,
  replacePending,
  toThreadMessage,
  upsertMessages,
  type MessageRow,
} from "@/lib/messages-cache";
import type { ConversationSummary, Thread, ThreadMessage } from "@/lib/queries";

/**
 * The races these cover — an echo beating the POST response, two identical
 * messages in flight at once, a device clock running slow — need two devices
 * and unlucky timing to reproduce by hand. They are pure functions precisely
 * so they can be tested here instead.
 */

const ME = "11111111-1111-1111-1111-111111111111";
const THEM = "22222222-2222-2222-2222-222222222222";
const CONNECTION = "33333333-3333-3333-3333-333333333333";

function message(overrides: Partial<ThreadMessage> & { id: string }): ThreadMessage {
  return {
    body: "hi",
    createdAt: "2026-09-05T10:00:00.000Z",
    fromMe: false,
    readAt: null,
    ...overrides,
  };
}

function thread(messages: ThreadMessage[]): Thread {
  return {
    connectionId: CONNECTION,
    counterpart: { id: THEM, name: "Ravi", role: "coach", username: "ravi" },
    messages,
  };
}

function row(overrides: Partial<MessageRow> & { id: string }): MessageRow {
  return {
    connection_id: CONNECTION,
    sender_id: THEM,
    body: "hi",
    read_at: null,
    created_at: "2026-09-05 10:00:00+00",
    ...overrides,
  };
}

describe("toThreadMessage", () => {
  test("normalises Postgres timestamps to ISO", () => {
    const converted = toThreadMessage(row({ id: "a", created_at: "2026-09-05 10:00:00+00" }), ME);
    expect(converted.createdAt).toBe("2026-09-05T10:00:00.000Z");
  });

  test("resolves fromMe against the signed-in user", () => {
    expect(toThreadMessage(row({ id: "a", sender_id: ME }), ME).fromMe).toBe(true);
    expect(toThreadMessage(row({ id: "a", sender_id: THEM }), ME).fromMe).toBe(false);
  });
});

describe("upsertMessages", () => {
  test("returns the same reference when nothing changed", () => {
    const list = [message({ id: "a" })];
    expect(upsertMessages(list, [message({ id: "a" })])).toBe(list);
  });

  test("replaces by id and keeps ascending order", () => {
    const list = [
      message({ id: "a", createdAt: "2026-09-05T10:00:00.000Z" }),
      message({ id: "c", createdAt: "2026-09-05T10:02:00.000Z" }),
    ];
    const next = upsertMessages(list, [
      message({ id: "b", createdAt: "2026-09-05T10:01:00.000Z" }),
    ]);
    expect(next.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  test("a readAt update replaces rather than duplicates", () => {
    const list = [message({ id: "a", fromMe: true })];
    const next = upsertMessages(list, [
      message({ id: "a", fromMe: true, readAt: "2026-09-05T10:05:00.000Z" }),
    ]);
    expect(next).toHaveLength(1);
    expect(next[0].readAt).toBe("2026-09-05T10:05:00.000Z");
  });
});

describe("pendingCreatedAt", () => {
  test("clamps past the newest message when the device clock lags", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const stamp = pendingCreatedAt([message({ id: "a", createdAt: future })]);
    expect(new Date(stamp).getTime()).toBeGreaterThan(new Date(future).getTime() - 1);
  });

  test("uses now when the thread is behind", () => {
    const stamp = pendingCreatedAt([message({ id: "a", createdAt: "2020-01-01T00:00:00.000Z" })]);
    expect(new Date(stamp).getTime()).toBeGreaterThan(Date.parse("2020-01-01T00:00:00.000Z"));
  });
});

describe("newPendingId", () => {
  test("does not collide across calls", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newPendingId()));
    expect(ids.size).toBe(200);
  });
});

describe("applyBroadcasts", () => {
  test("an incoming message is appended", () => {
    const next = applyBroadcasts(
      thread([]),
      [{ operation: "INSERT", row: row({ id: "a", body: "nice shot" }) }],
      ME,
    );
    expect(next?.messages.map((m) => m.body)).toEqual(["nice shot"]);
  });

  test("an own echo retires the pending bubble instead of duplicating it", () => {
    const pending = message({ id: "pending-1", body: "on my way", fromMe: true, status: "sending" });
    const next = applyBroadcasts(
      thread([pending]),
      [{ operation: "INSERT", row: row({ id: "server-1", sender_id: ME, body: "on my way" }) }],
      ME,
    );
    expect(next?.messages).toHaveLength(1);
    expect(next?.messages[0].id).toBe("server-1");
    expect(next?.messages[0].status).toBeUndefined();
  });

  test("two identical messages in flight retire one bubble each, in order", () => {
    const first = message({
      id: "pending-1",
      body: "ok",
      fromMe: true,
      status: "sending",
      createdAt: "2026-09-05T10:00:00.000Z",
    });
    const second = message({
      id: "pending-2",
      body: "ok",
      fromMe: true,
      status: "sending",
      createdAt: "2026-09-05T10:00:01.000Z",
    });

    const afterFirst = applyBroadcasts(
      thread([first, second]),
      [
        {
          operation: "INSERT",
          row: row({ id: "server-1", sender_id: ME, body: "ok", created_at: "2026-09-05 10:00:00+00" }),
        },
      ],
      ME,
    );
    expect(afterFirst?.messages.map((m) => m.id)).toEqual(["server-1", "pending-2"]);

    const afterSecond = applyBroadcasts(
      afterFirst,
      [
        {
          operation: "INSERT",
          row: row({ id: "server-2", sender_id: ME, body: "ok", created_at: "2026-09-05 10:00:01+00" }),
        },
      ],
      ME,
    );
    expect(afterSecond?.messages.map((m) => m.id)).toEqual(["server-1", "server-2"]);
  });

  test("a message this user sent from another device still arrives", () => {
    const next = applyBroadcasts(
      thread([]),
      [{ operation: "INSERT", row: row({ id: "web-1", sender_id: ME, body: "sent from the web" }) }],
      ME,
    );
    expect(next?.messages.map((m) => m.body)).toEqual(["sent from the web"]);
  });

  test("read receipts on your own messages land", () => {
    const own = message({ id: "server-1", fromMe: true });
    const next = applyBroadcasts(
      thread([own]),
      [
        {
          operation: "UPDATE",
          row: row({ id: "server-1", sender_id: ME, read_at: "2026-09-05 10:05:00+00" }),
        },
      ],
      ME,
    );
    expect(next?.messages[0].readAt).toBe("2026-09-05T10:05:00.000Z");
  });

  test("updates to the other party's messages are dropped as inert", () => {
    const incoming = thread([message({ id: "server-1" })]);
    const next = applyBroadcasts(
      incoming,
      [
        {
          operation: "UPDATE",
          row: row({ id: "server-1", sender_id: THEM, read_at: "2026-09-05 10:05:00+00" }),
        },
      ],
      ME,
    );
    expect(next).toBe(incoming);
  });

  test("a mark-read storm over received messages costs one no-op", () => {
    const before = thread(
      Array.from({ length: 50 }, (_, index) => message({ id: `server-${index}` })),
    );
    const storm = Array.from({ length: 50 }, (_, index) => ({
      operation: "UPDATE" as const,
      row: row({ id: `server-${index}`, sender_id: THEM, read_at: "2026-09-05 10:05:00+00" }),
    }));
    expect(applyBroadcasts(before, storm, ME)).toBe(before);
  });

  test("an empty thread cache is never fabricated", () => {
    expect(applyBroadcasts(undefined, [{ operation: "INSERT", row: row({ id: "a" }) }], ME)).toBeUndefined();
  });
});

describe("replacePending", () => {
  test("swaps the optimistic bubble for the server row", () => {
    const pending = message({ id: "pending-1", body: "hey", fromMe: true, status: "sending" });
    const next = replacePending(
      thread([pending]),
      "pending-1",
      message({ id: "server-1", body: "hey", fromMe: true }),
    );
    expect(next?.messages.map((m) => m.id)).toEqual(["server-1"]);
  });

  test("is a no-op when the echo already retired the bubble", () => {
    const confirmed = message({ id: "server-1", body: "hey", fromMe: true });
    const next = replacePending(thread([confirmed]), "pending-1", confirmed);
    expect(next?.messages.map((m) => m.id)).toEqual(["server-1"]);
  });
});

describe("patchConversation", () => {
  const list: ConversationSummary[] = [
    {
      connectionId: "other",
      counterpart: { id: "x", name: "Asha", role: "player", username: "asha" },
      lastMessage: { body: "later", createdAt: "2026-09-05T11:00:00.000Z", fromMe: false },
      unreadCount: 0,
    },
    {
      connectionId: CONNECTION,
      counterpart: { id: THEM, name: "Ravi", role: "coach", username: "ravi" },
      lastMessage: { body: "hi", createdAt: "2026-09-05T10:00:00.000Z", fromMe: false },
      unreadCount: 2,
    },
  ];

  test("moves the conversation to the top and bumps unread", () => {
    const next = patchConversation(
      list,
      CONNECTION,
      { body: "you free?", createdAt: "2026-09-05T12:00:00.000Z", fromMe: false },
      1,
    );
    expect(next?.[0].connectionId).toBe(CONNECTION);
    expect(next?.[0].unreadCount).toBe(3);
  });

  test("never drops unread below zero", () => {
    const next = patchConversation(list, "other", null, -5);
    expect(next?.[0].unreadCount).toBe(0);
  });

  test("returns null for a connection the inbox has never listed", () => {
    expect(patchConversation(list, "unknown", null, 1)).toBeNull();
  });

  test("clearUnread returns the same reference when already zero", () => {
    expect(clearUnread(list, "other")).toBe(list);
  });
});

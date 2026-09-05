import { focusManager, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  applyBroadcasts,
  patchConversation,
  toThreadMessage,
  type BroadcastChange,
  type MessageRow,
} from "@/lib/messages-cache";
import {
  connectionsKey,
  conversationsKey,
  threadKey,
  useConnections,
  type ConversationSummary,
  type Thread,
} from "@/lib/queries";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

/**
 * Live message delivery.
 *
 * Every insert and update on `public.messages` is broadcast by a Postgres
 * trigger to the private topic `connection:<id>`, gated by an RLS policy on
 * `realtime.messages` that only lets participants of an accepted connection
 * subscribe (prisma/migrations/20260702080000_realtime_messaging). The client
 * never reads the table — it only receives broadcasts, and every write still
 * goes through the Next.js API.
 *
 * This is the mobile counterpart of components/messages-realtime.tsx, minus its
 * listener registry and debounced `router.refresh()`. Those exist because the
 * web's thread lives in component state fed by RSC props; here the React Query
 * cache *is* the fan-out, so writing to it re-renders whichever screens happen
 * to be mounted.
 *
 * Token refresh needs no code: supabase-js listens to its own auth events and
 * calls `realtime.setAuth()` on TOKEN_REFRESHED, and realtime-js pushes the new
 * token to already-joined channels rather than requiring a resubscribe.
 */

/** Broadcasts arrive per row. Marking a thread read is one `updateMany`, so a
 * 50-unread thread lands 50 of them at once — on the frame the thread opens.
 * Buffering coalesces a burst into one cache write per conversation. */
const FLUSH_MS = 50;

/** Below this, a resume is an app-switcher peek and the socket is still good. */
const STALE_SOCKET_MS = 30_000;

/**
 * One channel per accepted connection, capped. Supabase counts a client as one
 * websocket however many channels it joins, so the cost is joins rather than
 * connections — but a coach with hundreds of players would still hit the
 * per-client channel ceiling and stall behind that many joins on launch. Past
 * the cap, those conversations fall back to the refetch-on-focus behaviour the
 * app had before realtime.
 */
const MAX_TOPICS = 50;

type Flush = { changes: BroadcastChange[] };

function applyToCaches(queryClient: QueryClient, changes: BroadcastChange[], userId: string) {
  const byConnection = new Map<string, BroadcastChange[]>();
  for (const change of changes) {
    const existing = byConnection.get(change.row.connection_id);
    if (existing) existing.push(change);
    else byConnection.set(change.row.connection_id, [change]);
  }

  let needsConversationRefetch = false;

  for (const [connectionId, group] of byConnection) {
    queryClient.setQueryData<Thread>(threadKey(connectionId), (thread) =>
      applyBroadcasts(thread, group, userId),
    );

    // Only inserts move the inbox. An update is only ever a readAt write: it
    // changes no preview, and the reader already zeroed their own unread count
    // optimistically when they opened the thread.
    const inserts = group.filter((change) => change.operation === "INSERT");
    if (!inserts.length) continue;

    const newest = toThreadMessage(inserts[inserts.length - 1].row, userId);
    const incoming = inserts.filter((change) => change.row.sender_id !== userId).length;

    queryClient.setQueryData<{ conversations: ConversationSummary[] }>(conversationsKey, (data) => {
      if (!data) return data;
      const conversations = patchConversation(
        data.conversations,
        connectionId,
        { body: newest.body, createdAt: newest.createdAt, fromMe: newest.fromMe },
        incoming,
      );
      // Not in the inbox yet — a broadcast row has no counterpart name or role,
      // so there is nothing to synthesise a summary from. Refetch instead. This
      // is the first-ever-message case: /api/messages is fetched with
      // withMessagesOnly, so it omits connections nobody has written to.
      if (!conversations) {
        needsConversationRefetch = true;
        return data;
      }
      return { ...data, conversations };
    });
  }

  if (needsConversationRefetch) {
    void queryClient.invalidateQueries({ queryKey: conversationsKey });
  }
}

/** Renders nothing. Mounted once, inside SessionProvider. */
export function MessagesRealtime() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const { data: connections } = useConnections();

  const userId = session?.userId ?? null;
  const topicsKey = (connections?.accepted ?? [])
    .slice(0, MAX_TOPICS)
    .map((person) => person.connectionId)
    .sort()
    .join(",");

  // Bumped to force a rebuild of every channel after a long background, when
  // the socket is likely dead but does not know it yet.
  const [generation, setGeneration] = useState(0);

  const buffer = useRef<Flush>({ changes: [] });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId || !topicsKey) return;

    const ids = topicsKey.split(",");
    const channels: RealtimeChannel[] = [];
    const joined = new Set<string>();
    let cancelled = false;

    const flush = () => {
      timer.current = null;
      const { changes } = buffer.current;
      if (!changes.length) return;
      buffer.current = { changes: [] };
      applyToCaches(queryClient, changes, userId);
    };

    const handle = (operation: "INSERT" | "UPDATE") => (payload: { payload?: { record?: MessageRow } }) => {
      const row = payload.payload?.record;
      if (!row?.id || !row.connection_id) return;
      buffer.current.changes.push({ operation, row });
      if (!timer.current) timer.current = setTimeout(flush, FLUSH_MS);
    };

    (async () => {
      // Private channels authorize against the session JWT. supabase-js sets
      // this itself on auth events; doing it here too removes the cold-start
      // ordering question between SessionProvider's setSession and this effect.
      await supabase.realtime.setAuth();
      if (cancelled) return;

      for (const connectionId of ids) {
        const channel = supabase
          .channel(`connection:${connectionId}`, { config: { private: true } })
          .on("broadcast", { event: "INSERT" }, handle("INSERT"))
          .on("broadcast", { event: "UPDATE" }, handle("UPDATE"))
          .subscribe((status) => {
            if (status !== "SUBSCRIBED") return;
            // A re-join means the channel had dropped — an auth failure, a
            // network blip, a token that expired mid-flight. Broadcast has no
            // replay, so anything published while it was down is gone unless we
            // go and ask. Without this, a channel can die silently and the app
            // looks fine while messages simply stop arriving.
            if (joined.has(connectionId)) {
              void queryClient.invalidateQueries({ queryKey: threadKey(connectionId) });
              void queryClient.invalidateQueries({ queryKey: conversationsKey });
            }
            joined.add(connectionId);
          });
        channels.push(channel);
      }
    })();

    return () => {
      cancelled = true;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      buffer.current = { changes: [] };
      channels.forEach((channel) => void supabase.removeChannel(channel));
    };
  }, [queryClient, userId, topicsKey, generation]);

  useEffect(() => {
    let previous = AppState.currentState;
    let backgroundedAt = 0;

    const subscription = AppState.addEventListener("change", (next: AppStateStatus) => {
      const wasBackground = previous === "background";
      previous = next;

      if (next === "active") {
        // iOS suspends timers while backgrounded, so the refresh ticker needs
        // an immediate tick on resume rather than waiting for its next one.
        void supabase.auth.startAutoRefresh();
        focusManager.setFocused(true);

        // Only a real background→active transition. iOS also emits `active`
        // after control centre, notification centre and permission dialogs,
        // and refetching everything on those would be constant churn.
        if (wasBackground && Date.now() - backgroundedAt > STALE_SOCKET_MS) {
          // The socket is very likely dead after a long suspend, but realtime-js
          // takes a heartbeat timeout to find out — up to ~35s of an app that
          // looks live and receives nothing. Force a clean reconnect instead.
          void supabase.realtime.removeAllChannels();
          setGeneration((value) => value + 1);
        }
        return;
      }

      if (next === "background" || next === "inactive") {
        backgroundedAt = Date.now();
        focusManager.setFocused(false);
        void supabase.auth.stopAutoRefresh();
      }
    });

    return () => subscription.remove();
  }, []);

  // Signing out must not leave the next account looking at this one's cached
  // conversations — the QueryClient is module-scope and outlives the session.
  useEffect(() => {
    if (userId) return;
    void supabase.realtime.removeAllChannels();
    queryClient.removeQueries({ queryKey: conversationsKey });
    queryClient.removeQueries({ queryKey: connectionsKey });
    queryClient.removeQueries({ queryKey: ["thread"] });
  }, [queryClient, userId]);

  return null;
}

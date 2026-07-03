"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type MessageChange = {
  operation: "INSERT" | "UPDATE";
  message: {
    id: string;
    connectionId: string;
    senderId: string;
    body: string;
    createdAt: string;
    readAt: string | null;
  };
};

type Listener = (change: MessageChange) => void;

const MessagesRealtimeContext = createContext<{
  subscribe: (connectionId: string, listener: Listener) => () => void;
} | null>(null);

/** Row payload from realtime.broadcast_changes — snake_case DB columns. */
type MessageRow = {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

const REFRESH_DEBOUNCE_MS = 800;

function toIso(value: string | null) {
  return value === null ? null : new Date(value).toISOString();
}

/**
 * Subscribes to the private realtime topic of every conversation over a
 * single websocket. Delivers changes to interested components (the open
 * thread) and debounce-refreshes the router so server-rendered UI (sidebar
 * previews, unread badges) stays in sync.
 */
export function MessagesRealtime({
  connectionIds,
  children,
}: {
  connectionIds: string[];
  children: ReactNode;
}) {
  const router = useRouter();
  const listenersRef = useRef(new Map<string, Set<Listener>>());
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topicsKey = connectionIds.join(",");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const ids = topicsKey ? topicsKey.split(",") : [];
    const channels: RealtimeChannel[] = [];
    let cancelled = false;

    const handleBroadcast = (payload: {
      payload?: { operation?: string; record?: MessageRow };
    }) => {
      const { operation, record } = payload.payload ?? {};
      if (!record || (operation !== "INSERT" && operation !== "UPDATE")) return;

      const change: MessageChange = {
        operation,
        message: {
          id: record.id,
          connectionId: record.connection_id,
          senderId: record.sender_id,
          body: record.body,
          createdAt: toIso(record.created_at) ?? record.created_at,
          readAt: toIso(record.read_at),
        },
      };
      listenersRef.current.get(record.connection_id)?.forEach((listener) => listener(change));

      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    };

    (async () => {
      // Private channels are authorized against the user's session JWT.
      await supabase.realtime.setAuth();
      if (cancelled) return;

      for (const connectionId of ids) {
        channels.push(
          supabase
            .channel(`connection:${connectionId}`, { config: { private: true } })
            .on("broadcast", { event: "INSERT" }, handleBroadcast)
            .on("broadcast", { event: "UPDATE" }, handleBroadcast)
            .subscribe(),
        );
      }
    })();

    return () => {
      cancelled = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      channels.forEach((channel) => void supabase.removeChannel(channel));
    };
  }, [router, topicsKey]);

  const subscribe = useCallback((connectionId: string, listener: Listener) => {
    const listeners = listenersRef.current.get(connectionId) ?? new Set<Listener>();
    listeners.add(listener);
    listenersRef.current.set(connectionId, listeners);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const value = useMemo(() => ({ subscribe }), [subscribe]);

  return (
    <MessagesRealtimeContext.Provider value={value}>{children}</MessagesRealtimeContext.Provider>
  );
}

/** Delivers realtime message changes for one conversation to `onChange`. */
export function useMessageChanges(connectionId: string, onChange: Listener) {
  const context = useContext(MessagesRealtimeContext);
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    if (!context) return;
    return context.subscribe(connectionId, (change) => handler.current(change));
  }, [context, connectionId]);
}

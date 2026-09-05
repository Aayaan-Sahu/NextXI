import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  clearUnread,
  insertPending,
  newPendingId,
  patchConversation,
  pendingCreatedAt,
  replacePending,
  setMessageStatus,
} from "@/lib/messages-cache";
import { useSession } from "@/lib/session";

/**
 * Response shapes mirror the API routes' return values one-for-one (see
 * app/api/videos, app/api/connections, app/api/messages at the repo root).
 * Duplicated here rather than imported — this pass skips the shared/api/*.ts
 * zod-schema extraction docs/mobile-apps.md eventually calls for.
 */

export type VideoGridItem = {
  id: string;
  category: string | null;
  createdAt: string;
  handedness: string | null;
  originalFilename: string;
  sizeBytes: number;
  thumbnailPath: string | null;
  uploadedAt: string | null;
  variation: string | null;
  commentCount: number;
  reportStatus: "PENDING" | "PROCESSING" | "READY" | "FAILED" | "WITH_COACH";
  tagLabel: string;
  thumbnailUrl: string | null;
};

export type PersonRole = "player" | "coach" | "club" | null;

export type ConnectionPerson = {
  connectionId: string;
  id: string;
  name: string;
  role: PersonRole;
  username: string | null;
};

export type ConnectionPanelData = {
  accepted: ConnectionPerson[];
  incomingPending: ConnectionPerson[];
  outgoingPending: ConnectionPerson[];
};

export type DirectoryConnectionState = "none" | "pending" | "incoming" | "accepted" | "revoked";

export type CoachDirectoryEntry = {
  id: string;
  name: string;
  username: string | null;
  accomplishments: string[];
  state: DirectoryConnectionState;
  connectionId: string | null;
};

export type PlayerSearchEntry = {
  id: string;
  name: string;
  username: string | null;
  roles: string[];
  country: string;
  state: DirectoryConnectionState;
  connectionId: string | null;
};

export type Counterpart = { id: string; name: string; role: PersonRole; username: string | null };

export type ConversationSummary = {
  connectionId: string;
  counterpart: Counterpart;
  lastMessage: { body: string; createdAt: string; fromMe: boolean } | null;
  unreadCount: number;
};

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  fromMe: boolean;
  readAt: string | null;
  /** Client-only. Absent once the server has confirmed the message. */
  status?: "sending" | "failed";
};

export type Thread = { connectionId: string; counterpart: Counterpart; messages: ThreadMessage[] };

export type Me = {
  user: { id: string; email: string | null };
  role: "player" | "coach" | "guardian" | null;
  username: string | null;
  player: { name: string } | null;
};

export type FeedbackItem = {
  id: string;
  authorName: string;
  authorUsername: string;
  body: string;
  createdAt: string;
  timestampSec: number | null;
  videoId: string;
  video: { originalFilename: string };
};

/**
 * Shared with lib/messages-realtime.tsx, which writes into these same caches.
 * Constants rather than inline literals so the socket and the screens cannot
 * drift onto different keys — a silent failure where realtime "works" but the
 * open thread never re-renders.
 */
export const conversationsKey = ["conversations"] as const;
export const connectionsKey = ["connections"] as const;
export function threadKey(connectionId: string) {
  return ["thread", connectionId] as const;
}

function useToken() {
  return useSession().session?.accessToken ?? null;
}

export function useMe() {
  const accessToken = useToken();
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<Me>("/api/me", { accessToken }),
    enabled: !!accessToken,
  });
}

export function useRecentFeedback() {
  const accessToken = useToken();
  return useQuery({
    queryKey: ["videos", "comments"],
    queryFn: () => apiFetch<{ comments: FeedbackItem[] }>("/api/videos/comments", { accessToken }),
    enabled: !!accessToken,
  });
}

/** Total unread messages across every conversation, for the tab bar badge. */
export function useUnreadMessageCount() {
  const { data } = useConversations();
  return (data?.conversations ?? []).reduce((sum, conversation) => sum + conversation.unreadCount, 0);
}

export function useVideos() {
  const accessToken = useToken();
  return useQuery({
    queryKey: ["videos"],
    queryFn: () => apiFetch<{ videos: VideoGridItem[] }>("/api/videos", { accessToken }),
    enabled: !!accessToken,
  });
}

export function useConnections() {
  const accessToken = useToken();
  return useQuery({
    queryKey: connectionsKey,
    queryFn: () => apiFetch<ConnectionPanelData>("/api/connections", { accessToken }),
    enabled: !!accessToken,
  });
}

export function useCoachDirectory(query: string) {
  const accessToken = useToken();
  return useQuery({
    queryKey: ["directory", "coaches", query],
    queryFn: () =>
      apiFetch<{ coaches: CoachDirectoryEntry[] }>(
        `/api/directory/coaches${query ? `?q=${encodeURIComponent(query)}` : ""}`,
        { accessToken },
      ),
    enabled: !!accessToken,
  });
}

/** Search-only player discovery by name or @username — no browsable roster, matches the web's PlayerSearch. */
export function usePlayerSearch(query: string) {
  const accessToken = useToken();
  return useQuery({
    queryKey: ["directory", "players", query],
    queryFn: () =>
      apiFetch<{ players: PlayerSearchEntry[] }>(
        `/api/directory/players${query ? `?q=${encodeURIComponent(query)}` : ""}`,
        { accessToken },
      ),
    enabled: !!accessToken && !!query,
  });
}

export function useConversations() {
  const accessToken = useToken();
  return useQuery({
    queryKey: conversationsKey,
    queryFn: () => apiFetch<{ conversations: ConversationSummary[] }>("/api/messages", { accessToken }),
    enabled: !!accessToken,
  });
}

export function useThread(connectionId: string) {
  const accessToken = useToken();
  return useQuery({
    queryKey: threadKey(connectionId),
    queryFn: () => apiFetch<Thread>(`/api/messages/${connectionId}`, { accessToken }),
    enabled: !!accessToken && !!connectionId,
  });
}

export function useMarkThreadRead(connectionId: string) {
  const accessToken = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: true }>(`/api/messages/${connectionId}/read`, { method: "POST", accessToken }),
    // Clear the badge on the frame the thread opens rather than a round trip
    // later — the tab badge reads this cache through useUnreadMessageCount.
    onMutate: () => {
      queryClient.setQueryData<{ conversations: ConversationSummary[] }>(conversationsKey, (data) =>
        data ? { ...data, conversations: clearUnread(data.conversations, connectionId) } : data,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: conversationsKey }),
  });
}

export type SendMessageVariables = { body: string; tempId?: string };

/**
 * Sends optimistically: the bubble is in the cache before the request leaves.
 *
 * A failed send deliberately does *not* roll back — the bubble stays, marked
 * `failed`, so the thread screen can offer a retry with the same `tempId`
 * rather than the user's text vanishing. Rollback is also surgical by id, never
 * a snapshot restore: with two sends in flight, restoring a pre-mutation
 * snapshot would delete the *other* one, and a broadcast that landed in between
 * would be lost with it.
 */
export function useSendMessage(connectionId: string) {
  const accessToken = useToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body }: SendMessageVariables) =>
      apiFetch<{ ok: true; message: ThreadMessage }>(`/api/messages/${connectionId}`, {
        method: "POST",
        accessToken,
        body: { body },
      }),

    onMutate: async ({ body, tempId }) => {
      // An in-flight thread GET (the screen refetches on focus) would otherwise
      // resolve after this and overwrite the bubble straight back out again.
      // Only worth doing once there is something to protect: cancelling the
      // *first* fetch would leave the screen with no thread at all, and an
      // empty cache has nothing for the optimistic write to land in anyway.
      if (queryClient.getQueryData<Thread>(threadKey(connectionId))) {
        await queryClient.cancelQueries({ queryKey: threadKey(connectionId) });
      }

      const id = tempId ?? newPendingId();

      queryClient.setQueryData<Thread>(threadKey(connectionId), (thread) => {
        if (!thread) return thread;
        // Retrying reuses the same bubble rather than stacking a second one.
        if (thread.messages.some((message) => message.id === id)) {
          return setMessageStatus(thread, id, "sending");
        }
        return insertPending(thread, {
          id,
          body,
          createdAt: pendingCreatedAt(thread.messages),
          fromMe: true,
          readAt: null,
          status: "sending",
        });
      });

      queryClient.setQueryData<{ conversations: ConversationSummary[] }>(conversationsKey, (data) => {
        if (!data) return data;
        const conversations = patchConversation(
          data.conversations,
          connectionId,
          { body, createdAt: new Date().toISOString(), fromMe: true },
          0,
        );
        return conversations ? { ...data, conversations } : data;
      });

      return { id };
    },

    onSuccess: (result, _variables, context) => {
      queryClient.setQueryData<Thread>(threadKey(connectionId), (thread) =>
        replacePending(thread, context.id, result.message),
      );

      // The inbox omits connections nobody has written to (withMessagesOnly),
      // so a first-ever message needs a refetch to appear at all — a broadcast
      // row carries no counterpart name to build a summary from.
      const cached = queryClient.getQueryData<{ conversations: ConversationSummary[] }>(conversationsKey);
      const listed = cached?.conversations.some(
        (conversation) => conversation.connectionId === connectionId,
      );
      if (listed) {
        queryClient.setQueryData<{ conversations: ConversationSummary[] }>(conversationsKey, (data) => {
          if (!data) return data;
          const conversations = patchConversation(
            data.conversations,
            connectionId,
            { body: result.message.body, createdAt: result.message.createdAt, fromMe: true },
            0,
          );
          return conversations ? { ...data, conversations } : data;
        });
      } else {
        queryClient.invalidateQueries({ queryKey: conversationsKey });
      }
    },

    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData<Thread>(threadKey(connectionId), (thread) =>
        setMessageStatus(thread, context.id, "failed"),
      );
    },

    // Sending into a thread whose first fetch hasn't landed leaves nothing for
    // the cache writes above to touch — the message is real, it just has
    // nowhere to render. Go and get it.
    onSettled: () => {
      if (!queryClient.getQueryData<Thread>(threadKey(connectionId))) {
        queryClient.invalidateQueries({ queryKey: threadKey(connectionId) });
      }
    },
  });
}

export function useRespondToConnection() {
  const accessToken = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ connectionId, response }: { connectionId: string; response: "accept" | "decline" }) =>
      apiFetch<{ message: string }>(`/api/connections/${connectionId}/respond`, {
        method: "POST",
        accessToken,
        body: { response },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionsKey });
      queryClient.invalidateQueries({ queryKey: ["directory", "coaches"] });
      queryClient.invalidateQueries({ queryKey: ["directory", "players"] });
    },
  });
}

export function useCancelConnectionRequest() {
  const accessToken = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) =>
      apiFetch<{ message: string }>(`/api/connections/${connectionId}/request`, {
        method: "DELETE",
        accessToken,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: connectionsKey }),
  });
}

/**
 * Removes a connection outright — the roster's X. The server deletes the row
 * and the pair's messages with it, so the conversation has to leave the
 * message tab's cache too, not just the connections list.
 */
export function useRemoveConnection() {
  const accessToken = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) =>
      apiFetch<{ message: string }>(`/api/connections/${connectionId}`, {
        method: "DELETE",
        accessToken,
      }),
    onSuccess: (_result, connectionId) => {
      queryClient.removeQueries({ queryKey: threadKey(connectionId) });
      queryClient.invalidateQueries({ queryKey: connectionsKey });
      queryClient.invalidateQueries({ queryKey: conversationsKey });
      queryClient.invalidateQueries({ queryKey: ["directory", "coaches"] });
      queryClient.invalidateQueries({ queryKey: ["directory", "players"] });
    },
  });
}

export function useCreateConnectionRequest() {
  const accessToken = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetId: string) =>
      apiFetch<{ message: string }>("/api/connections", {
        method: "POST",
        accessToken,
        body: { targetId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionsKey });
      queryClient.invalidateQueries({ queryKey: ["directory", "coaches"] });
      queryClient.invalidateQueries({ queryKey: ["directory", "players"] });
    },
  });
}

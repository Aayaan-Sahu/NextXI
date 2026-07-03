import { ConnectionStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { describeUsers, type PersonRole } from "@/lib/connections";

export type Counterpart = {
  id: string;
  name: string;
  role: PersonRole;
  username: string | null;
};

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
};

export type Thread = {
  connectionId: string;
  counterpart: Counterpart;
  messages: ThreadMessage[];
};

/**
 * Returns the connection if `userId` is a participant and the connection is
 * accepted; otherwise null. This is the authorization gate for messaging.
 */
export async function authorizeConversation(userId: string, connectionId: string) {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { id: true, userAId: true, userBId: true, status: true },
  });

  if (!connection) return null;

  const isParticipant = connection.userAId === userId || connection.userBId === userId;
  if (!isParticipant || connection.status !== ConnectionStatus.ACCEPTED) return null;

  return connection;
}

export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  const connections = await prisma.connection.findMany({
    where: {
      status: ConnectionStatus.ACCEPTED,
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    select: {
      id: true,
      userAId: true,
      userBId: true,
      createdAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
    },
  });

  if (!connections.length) return [];

  const [people, unread] = await Promise.all([
    describeUsers(connections.map((c) => (c.userAId === userId ? c.userBId : c.userAId))),
    prisma.message.groupBy({
      by: ["connectionId"],
      where: {
        connectionId: { in: connections.map((c) => c.id) },
        senderId: { not: userId },
        readAt: null,
      },
      _count: true,
    }),
  ]);
  const unreadMap = new Map(unread.map((row) => [row.connectionId, row._count]));

  const summaries: ConversationSummary[] = connections.map((connection) => {
    const otherId = connection.userAId === userId ? connection.userBId : connection.userAId;
    const info = people.get(otherId);
    const last = connection.messages[0] ?? null;

    return {
      connectionId: connection.id,
      counterpart: {
        id: otherId,
        name: info?.name ?? "Unknown",
        role: info?.role ?? null,
        username: info?.username ?? null,
      },
      lastMessage: last
        ? { body: last.body, createdAt: last.createdAt.toISOString(), fromMe: last.senderId === userId }
        : null,
      unreadCount: unreadMap.get(connection.id) ?? 0,
    };
  });

  return summaries.sort((a, b) => {
    const at = a.lastMessage?.createdAt ?? "";
    const bt = b.lastMessage?.createdAt ?? "";
    return bt.localeCompare(at);
  });
}

export async function getThread(userId: string, connectionId: string): Promise<Thread | null> {
  const connection = await authorizeConversation(userId, connectionId);
  if (!connection) return null;

  const otherId = connection.userAId === userId ? connection.userBId : connection.userAId;
  const [people, messages] = await Promise.all([
    describeUsers([otherId]),
    prisma.message.findMany({
      where: { connectionId },
      orderBy: { createdAt: "asc" },
      select: { id: true, senderId: true, body: true, createdAt: true, readAt: true },
    }),
  ]);
  const info = people.get(otherId);

  return {
    connectionId,
    counterpart: {
      id: otherId,
      name: info?.name ?? "Unknown",
      role: info?.role ?? null,
      username: info?.username ?? null,
    },
    messages: messages.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      fromMe: message.senderId === userId,
      readAt: message.readAt?.toISOString() ?? null,
    })),
  };
}

/** Marks incoming unread messages in a conversation as read. */
export async function markConversationRead(userId: string, connectionId: string) {
  await prisma.message.updateMany({
    where: { connectionId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
}

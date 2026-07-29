import { ConnectionStatus, type PlayerRole } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { describeUsers, type PersonRole } from "@/lib/connections";
import {
  getConversations,
  getThread,
  type ConversationSummary,
  type Thread,
} from "@/lib/messages";

export type GuardianChild = {
  id: string;
  club: string;
  country: string;
  dateOfBirth: Date;
  heightCm: number;
  name: string;
  roles: PlayerRole[];
  weightKg: number | null;
};

/** All players linked to this guardian, oldest link first. */
export async function getGuardianChildren(guardianId: string): Promise<GuardianChild[]> {
  return prisma.player.findMany({
    where: { guardianId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      club: true,
      country: true,
      dateOfBirth: true,
      heightCm: true,
      name: true,
      roles: true,
      weightKg: true,
    },
  });
}

/**
 * Resolves the `?child=` URL param against the guardian's linked players,
 * falling back to the first child when the param is missing or not theirs.
 */
export function selectChild(
  children: GuardianChild[],
  childId: string | undefined,
): GuardianChild | null {
  return children.find((child) => child.id === childId) ?? children[0] ?? null;
}

/**
 * The linked child if `childId` belongs to this guardian, otherwise null.
 * Every guardian read of a child's connections or messages goes through
 * this gate.
 */
async function getLinkedChild(guardianId: string, childId: string) {
  return prisma.player.findFirst({
    where: { id: childId, guardianId },
    select: { id: true },
  });
}

export type ChildConnection = {
  connectionId: string;
  name: string;
  role: PersonRole;
  username: string | null;
  status: ConnectionStatus;
  /** When the connection reached its current status. */
  since: Date;
};

/**
 * Read-only list of a child's connections for guardian oversight, newest
 * first. Includes every status — pending requests and revoked links matter
 * as much as active ones when reviewing who can reach a minor. Returns null
 * when the child is not linked to this guardian.
 */
export async function getChildConnections(
  guardianId: string,
  childId: string,
): Promise<ChildConnection[] | null> {
  const child = await getLinkedChild(guardianId, childId);
  if (!child) return null;

  const rows = await prisma.connection.findMany({
    where: { OR: [{ userAId: childId }, { userBId: childId }] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userAId: true,
      userBId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const people = await describeUsers(
    rows.map((row) => (row.userAId === childId ? row.userBId : row.userAId)),
  );

  return rows.map((row) => {
    const otherId = row.userAId === childId ? row.userBId : row.userAId;
    const info = people.get(otherId);

    return {
      connectionId: row.id,
      name: info?.name ?? "Unknown",
      role: info?.role ?? null,
      username: info?.username ?? null,
      status: row.status,
      // The only writes to a connection are status changes, so updatedAt is
      // when it was accepted or revoked; a pending row is untouched since
      // the request.
      since: row.status === ConnectionStatus.PENDING ? row.createdAt : row.updatedAt,
    };
  });
}

/**
 * A child's conversation list, readable only by their linked guardian. The
 * underlying fetcher runs as the child, so `fromMe` and unread counts are
 * the child's perspective; nothing here writes, so the child's read state
 * is untouched.
 */
export async function getChildConversations(
  guardianId: string,
  childId: string,
): Promise<ConversationSummary[] | null> {
  const child = await getLinkedChild(guardianId, childId);
  if (!child) return null;

  return getConversations(childId);
}

/**
 * A single conversation thread from the child's perspective, readable only
 * by their linked guardian. Null when the child is not linked to this
 * guardian or is not a participant of the connection. Render-only: the
 * guardian viewing a thread must never mark the child's messages read.
 */
export async function getChildThread(
  guardianId: string,
  childId: string,
  connectionId: string,
): Promise<Thread | null> {
  const child = await getLinkedChild(guardianId, childId);
  if (!child) return null;

  return getThread(childId, connectionId);
}

import { ConnectionStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type PersonRole = "player" | "coach" | null;

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

/**
 * Orders a pair of user ids to match the `user_a_id < user_b_id` invariant on
 * the connections table. Supabase ids are canonical lowercase UUIDs, whose
 * lexicographic ordering matches Postgres' byte-wise UUID comparison.
 */
export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

type PersonInfo = { name: string; role: PersonRole; username: string | null };

export async function describeUsers(ids: string[]): Promise<Map<string, PersonInfo>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();

  const [profiles, players, coaches] = await Promise.all([
    prisma.profile.findMany({ where: { id: { in: unique } }, select: { id: true, username: true } }),
    prisma.player.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } }),
    prisma.coach.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } }),
  ]);

  const usernames = new Map(profiles.map((p) => [p.id, p.username]));
  const playerNames = new Map(players.map((p) => [p.id, p.name]));
  const coachNames = new Map(coaches.map((c) => [c.id, c.name]));

  const result = new Map<string, PersonInfo>();
  for (const id of unique) {
    const role: PersonRole = playerNames.has(id) ? "player" : coachNames.has(id) ? "coach" : null;
    result.set(id, {
      name: playerNames.get(id) ?? coachNames.get(id) ?? "Unknown",
      role,
      username: usernames.get(id) ?? null,
    });
  }

  return result;
}

/** Ids of users this user has an accepted connection with. */
export async function getAcceptedCounterpartIds(userId: string): Promise<string[]> {
  const rows = await prisma.connection.findMany({
    where: {
      status: ConnectionStatus.ACCEPTED,
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    select: { userAId: true, userBId: true },
  });

  return rows.map((row) => (row.userAId === userId ? row.userBId : row.userAId));
}

export async function getConnectionPanelData(userId: string): Promise<ConnectionPanelData> {
  const rows = await prisma.connection.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userAId: true,
      userBId: true,
      requestedById: true,
      status: true,
    },
  });

  const people = await describeUsers(
    rows.map((row) => (row.userAId === userId ? row.userBId : row.userAId)),
  );

  const data: ConnectionPanelData = {
    accepted: [],
    incomingPending: [],
    outgoingPending: [],
  };

  for (const row of rows) {
    const otherId = row.userAId === userId ? row.userBId : row.userAId;
    const info = people.get(otherId);
    const person: ConnectionPerson = {
      connectionId: row.id,
      id: otherId,
      name: info?.name ?? "Unknown",
      role: info?.role ?? null,
      username: info?.username ?? null,
    };

    if (row.status === ConnectionStatus.ACCEPTED) data.accepted.push(person);
    else if (row.requestedById === userId) data.outgoingPending.push(person);
    else data.incomingPending.push(person);
  }

  return data;
}

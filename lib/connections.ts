import {
  ClubStatus,
  CoachStatus,
  ConnectionStatus,
  PlayerRole,
  PlayerStatus,
  Visibility,
} from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

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

  const [profiles, players, coaches, clubs] = await Promise.all([
    prisma.profile.findMany({ where: { id: { in: unique } }, select: { id: true, username: true } }),
    prisma.player.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } }),
    prisma.coach.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } }),
    prisma.club.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } }),
  ]);

  const usernames = new Map(profiles.map((p) => [p.id, p.username]));
  const playerNames = new Map(players.map((p) => [p.id, p.name]));
  const coachNames = new Map(coaches.map((c) => [c.id, c.name]));
  const clubNames = new Map(clubs.map((c) => [c.id, c.name]));

  const result = new Map<string, PersonInfo>();
  for (const id of unique) {
    const role: PersonRole = playerNames.has(id)
      ? "player"
      : coachNames.has(id)
        ? "coach"
        : clubNames.has(id)
          ? "club"
          : null;
    result.set(id, {
      name: playerNames.get(id) ?? coachNames.get(id) ?? clubNames.get(id) ?? "Unknown",
      role,
      username: usernames.get(id) ?? null,
    });
  }

  return result;
}

export type ConnectionRequestOutcome = { message: string } | { error: string };

/**
 * The shared core of every "connect with this person" entry point: the
 * username form, the directories, and a club claiming the players who named
 * it. Validates eligibility, then either opens a new pending connection or
 * reopens a revoked one — the `[userAId, userBId]` unique constraint means a
 * revoked pair can never be re-inserted.
 *
 * It lives here rather than beside the server actions because a file marked
 * "use server" turns every export into a callable endpoint, and this is
 * internal machinery, not an action.
 */
export async function createConnectionRequest(
  requesterId: string,
  targetId: string,
): Promise<ConnectionRequestOutcome> {
  if (targetId === requesterId) {
    return { error: "You can't connect with yourself." };
  }

  const [targetCoach, targetPlayer, targetClub] = await Promise.all([
    prisma.coach.findUnique({ where: { id: targetId }, select: { status: true } }),
    prisma.player.findUnique({ where: { id: targetId }, select: { status: true } }),
    prisma.club.findUnique({ where: { id: targetId }, select: { status: true } }),
  ]);

  if (targetCoach && targetCoach.status !== CoachStatus.APPROVED) {
    return { error: "That coach is not available to connect yet." };
  }

  // A club is verified before it can reach a player, exactly as a coach is.
  if (targetClub && targetClub.status !== ClubStatus.APPROVED) {
    return { error: "That club is not available to connect yet." };
  }

  // Child safety: unapproved minors are unreachable until a guardian signs off.
  if (targetPlayer && targetPlayer.status !== PlayerStatus.ACTIVE) {
    return { error: "That player is not available to connect yet." };
  }

  const [userAId, userBId] = orderedPair(requesterId, targetId);
  const existing = await prisma.connection.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true, status: true },
  });

  if (existing?.status === ConnectionStatus.ACCEPTED) {
    return { error: "You are already connected." };
  }

  if (existing?.status === ConnectionStatus.PENDING) {
    return { error: "That request is already pending." };
  }

  if (existing) {
    // Previously revoked: reopen the same row instead of inserting a new one.
    await prisma.connection.update({
      where: { id: existing.id },
      data: { status: ConnectionStatus.PENDING, requestedById: requesterId },
    });
  } else {
    await prisma.connection.create({
      data: {
        userAId,
        userBId,
        requestedById: requesterId,
        status: ConnectionStatus.PENDING,
      },
    });
  }

  return { message: "Request sent." };
}

/** Whether the two users have an accepted connection. */
export async function hasAcceptedConnection(a: string, b: string): Promise<boolean> {
  const [userAId, userBId] = orderedPair(a, b);
  const row = await prisma.connection.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { status: true },
  });
  return row?.status === ConnectionStatus.ACCEPTED;
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

/** Connection state of a directory row, from the viewer's perspective. */
export type DirectoryConnectionState = "none" | "pending" | "accepted" | "revoked";

export type CoachDirectoryEntry = {
  id: string;
  name: string;
  username: string | null;
  accomplishments: string[];
  state: DirectoryConnectionState;
};

/**
 * Browsable list of approved coaches for players to discover, with each
 * coach's connection state relative to `viewerId` so the UI can render the
 * right call to action ("Request to connect", "Requested", "Connected", or
 * "Request again" for a revoked connection).
 */
export async function getCoachDirectory(
  viewerId: string,
  query?: string,
): Promise<CoachDirectoryEntry[]> {
  const trimmedQuery = query?.trim();

  const coaches = await prisma.coach.findMany({
    where: {
      status: CoachStatus.APPROVED,
      id: { not: viewerId },
      ...(trimmedQuery ? { name: { contains: trimmedQuery, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, accomplishments: true },
  });

  if (!coaches.length) return [];

  const [profiles, viewerConnections] = await Promise.all([
    prisma.profile.findMany({
      where: { id: { in: coaches.map((coach) => coach.id) } },
      select: { id: true, username: true },
    }),
    prisma.connection.findMany({
      where: { OR: [{ userAId: viewerId }, { userBId: viewerId }] },
      select: { userAId: true, userBId: true, status: true },
    }),
  ]);

  const usernames = new Map(profiles.map((profile) => [profile.id, profile.username]));
  const connectionByOtherId = new Map(
    viewerConnections.map((row) => [
      row.userAId === viewerId ? row.userBId : row.userAId,
      row.status,
    ]),
  );

  return coaches.map((coach) => {
    const status = connectionByOtherId.get(coach.id);
    const state: DirectoryConnectionState =
      status === ConnectionStatus.ACCEPTED
        ? "accepted"
        : status === ConnectionStatus.REVOKED
          ? "revoked"
          : status === ConnectionStatus.PENDING
            ? "pending"
            : "none";

    return {
      id: coach.id,
      name: coach.name,
      username: usernames.get(coach.id) ?? null,
      accomplishments: coach.accomplishments,
      state,
    };
  });
}

export type PlayerDirectoryEntry = {
  id: string;
  name: string;
  roles: PlayerRole[];
  country: string;
};

export type PlayerSearchEntry = {
  id: string;
  name: string;
  username: string | null;
  roles: PlayerRole[];
  country: string;
  state: DirectoryConnectionState;
};

/**
 * Search-only player discovery for players: unlike `getCoachDirectory`, an
 * empty query returns nothing — there is no browsable roster of every player
 * on the platform, only a match against a name or @username you already have
 * in mind. Only surfaces players who opted into discovery (`PUBLIC`) and are
 * active, same as `searchPlayers`.
 */
export async function searchPlayersByQuery(
  viewerId: string,
  query: string,
): Promise<PlayerSearchEntry[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const matchingProfiles = await prisma.profile.findMany({
    where: { username: { contains: trimmedQuery, mode: "insensitive" } },
    select: { id: true },
  });

  const players = await prisma.player.findMany({
    where: {
      visibility: Visibility.PUBLIC,
      status: PlayerStatus.ACTIVE,
      id: { not: viewerId },
      OR: [
        { name: { contains: trimmedQuery, mode: "insensitive" } },
        { id: { in: matchingProfiles.map((profile) => profile.id) } },
      ],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, roles: true, country: true },
  });

  if (!players.length) return [];

  const [profiles, viewerConnections] = await Promise.all([
    prisma.profile.findMany({
      where: { id: { in: players.map((player) => player.id) } },
      select: { id: true, username: true },
    }),
    prisma.connection.findMany({
      where: { OR: [{ userAId: viewerId }, { userBId: viewerId }] },
      select: { userAId: true, userBId: true, status: true },
    }),
  ]);

  const usernames = new Map(profiles.map((profile) => [profile.id, profile.username]));
  const connectionByOtherId = new Map(
    viewerConnections.map((row) => [
      row.userAId === viewerId ? row.userBId : row.userAId,
      row.status,
    ]),
  );

  return players.map((player) => {
    const status = connectionByOtherId.get(player.id);
    const state: DirectoryConnectionState =
      status === ConnectionStatus.ACCEPTED
        ? "accepted"
        : status === ConnectionStatus.REVOKED
          ? "revoked"
          : status === ConnectionStatus.PENDING
            ? "pending"
            : "none";

    return {
      id: player.id,
      name: player.name,
      username: usernames.get(player.id) ?? null,
      roles: player.roles,
      country: player.country,
      state,
    };
  });
}

/**
 * Searchable list of players for approved coaches to discover, filtered by
 * discipline (role) and country. Only surfaces players who opted into
 * discovery (`PUBLIC`) and are active — the same PUBLIC visibility the coach
 * player page checks before letting a non-connected coach view a profile.
 */
export async function searchPlayers(
  viewerId: string,
  filters: { role?: PlayerRole; country?: string },
): Promise<PlayerDirectoryEntry[]> {
  return prisma.player.findMany({
    where: {
      visibility: Visibility.PUBLIC,
      status: PlayerStatus.ACTIVE,
      id: { not: viewerId },
      ...(filters.role ? { roles: { has: filters.role } } : {}),
      ...(filters.country ? { country: filters.country } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, roles: true, country: true },
  });
}

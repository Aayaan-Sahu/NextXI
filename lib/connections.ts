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

/**
 * Handles are displayed everywhere with their sigil — "@sanai" — and both
 * search placeholders ask for an "@username", so that is the form people
 * type. The `username` column holds it without one, where a raw `contains`
 * would never match. Strip it before the query sees it.
 */
export function normalizeSearchQuery(query: string | undefined | null): string {
  return (query ?? "").trim().replace(/^@+/, "").trim();
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

export type RespondOutcome = { message: string } | { error: string };

/**
 * Accept or decline a pending connection request. Only the non-requesting
 * participant may respond — accepting flips the row to ACCEPTED, declining
 * deletes it outright (nothing about a request that was never opened is
 * worth keeping).
 */
export async function respondToConnection(
  userId: string,
  connectionId: string,
  response: "accept" | "decline",
): Promise<RespondOutcome> {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { userAId: true, userBId: true, requestedById: true, status: true },
  });

  if (!connection || connection.status !== ConnectionStatus.PENDING) {
    return { error: "Pending request not found." };
  }

  const isParticipant = connection.userAId === userId || connection.userBId === userId;
  if (!isParticipant || connection.requestedById === userId) {
    return { error: "Only the recipient can respond." };
  }

  if (response === "accept") {
    await prisma.connection.update({
      where: { id: connectionId },
      data: { status: ConnectionStatus.ACCEPTED },
    });
  } else {
    await prisma.connection.delete({ where: { id: connectionId } });
  }

  return { message: response === "accept" ? "Request accepted." : "Request declined." };
}

export type CancelOutcome = { message: string } | { error: string };

/**
 * Deletes a PENDING connection the caller requested — the outgoing-request
 * "Cancel" action. Unlike revoke (ACCEPTED → REVOKED, kept for history),
 * cancelling an unopened request has nothing worth keeping, so the row is
 * deleted, the same way declining one is.
 */
export async function cancelConnectionRequest(
  userId: string,
  connectionId: string,
): Promise<CancelOutcome> {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { userAId: true, userBId: true, requestedById: true, status: true },
  });

  const isParticipant =
    !!connection && (connection.userAId === userId || connection.userBId === userId);
  if (!connection || !isParticipant || connection.status !== ConnectionStatus.PENDING) {
    return { error: "Pending request not found." };
  }

  if (connection.requestedById !== userId) {
    return { error: "Only the requester can cancel this." };
  }

  await prisma.connection.delete({ where: { id: connectionId } });
  return { message: "Request cancelled." };
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

/**
 * Connection state of a directory row, from the viewer's perspective.
 * "pending" is a request the viewer sent and is waiting on; "incoming" is one
 * the other person sent, which the viewer must accept or ignore rather than
 * "request" again.
 */
export type DirectoryConnectionState = "none" | "pending" | "incoming" | "accepted" | "revoked";

export type CoachDirectoryEntry = {
  id: string;
  name: string;
  username: string | null;
  accomplishments: string[];
  state: DirectoryConnectionState;
  connectionId: string | null;
};

export type ViewerConnectionInfo = {
  connectionId: string;
  status: ConnectionStatus;
  requestedById: string;
};

/** Directory rows' connection state and id relative to `viewerId`, keyed by the other party's id. */
export async function getViewerConnectionsByOtherId(
  viewerId: string,
): Promise<Map<string, ViewerConnectionInfo>> {
  const rows = await prisma.connection.findMany({
    where: { OR: [{ userAId: viewerId }, { userBId: viewerId }] },
    select: { id: true, userAId: true, userBId: true, status: true, requestedById: true },
  });

  return new Map(
    rows.map((row) => [
      row.userAId === viewerId ? row.userBId : row.userAId,
      { connectionId: row.id, status: row.status, requestedById: row.requestedById },
    ]),
  );
}

/** A directory row's state — and which side a PENDING request came from — relative to `viewerId`. */
export function directoryState(
  viewerId: string,
  connection: ViewerConnectionInfo | undefined,
): DirectoryConnectionState {
  if (!connection) return "none";
  if (connection.status === ConnectionStatus.ACCEPTED) return "accepted";
  if (connection.status === ConnectionStatus.REVOKED) return "revoked";
  if (connection.status === ConnectionStatus.PENDING) {
    return connection.requestedById === viewerId ? "pending" : "incoming";
  }
  return "none";
}

/**
 * Browsable list of approved coaches for players to discover, with each
 * coach's connection state relative to `viewerId` so the UI can render the
 * right call to action ("Request to connect", "Requested", "Connected",
 * "Request again" for a revoked connection, or "Accept" / "Ignore" for a
 * request the coach already sent the viewer).
 */
export async function getCoachDirectory(
  viewerId: string,
  query?: string,
): Promise<CoachDirectoryEntry[]> {
  const trimmedQuery = normalizeSearchQuery(query);

  // Both search fields ask for "a @username or name", so a query has to reach
  // the handle as well as the name — the same two-column match
  // `searchPlayersByQuery` does.
  const matchingProfiles = trimmedQuery
    ? await prisma.profile.findMany({
        where: { username: { contains: trimmedQuery, mode: "insensitive" } },
        select: { id: true },
      })
    : [];

  const coaches = await prisma.coach.findMany({
    where: {
      status: CoachStatus.APPROVED,
      id: { not: viewerId },
      ...(trimmedQuery
        ? {
            OR: [
              { name: { contains: trimmedQuery, mode: "insensitive" } },
              { id: { in: matchingProfiles.map((profile) => profile.id) } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, accomplishments: true },
  });

  if (!coaches.length) return [];

  const [profiles, connectionByOtherId] = await Promise.all([
    prisma.profile.findMany({
      where: { id: { in: coaches.map((coach) => coach.id) } },
      select: { id: true, username: true },
    }),
    getViewerConnectionsByOtherId(viewerId),
  ]);

  const usernames = new Map(profiles.map((profile) => [profile.id, profile.username]));

  return coaches.map((coach) => {
    const connection = connectionByOtherId.get(coach.id);

    return {
      id: coach.id,
      name: coach.name,
      username: usernames.get(coach.id) ?? null,
      accomplishments: coach.accomplishments,
      state: directoryState(viewerId, connection),
      connectionId: connection?.connectionId ?? null,
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
  connectionId: string | null;
};

/**
 * Search-only player discovery **for players** — the "someone is trying to
 * find you" path. There is no browsable roster: an empty query returns
 * nothing, only a match against a name or @username already in mind.
 *
 * `visibility` decides how findable each side is, and the two rules differ:
 *
 * - **PUBLIC** — discoverable. A partial match on either the name or the
 *   handle surfaces them, so typing "san" finds Sano.
 * - **PRIVATE** — unlisted, not unreachable. They surface only for someone
 *   who types their handle in full, which is knowledge you can only have
 *   from the player themselves. Partial handles and names never reach them,
 *   so a private player can't be stumbled upon by browsing or by sharing a
 *   name with someone public.
 *
 * The coach-facing search (`searchPlayers`) is a different rule and a
 * different function: PUBLIC only, no exact-handle escape hatch.
 */
export async function searchPlayersByQuery(
  viewerId: string,
  query: string,
): Promise<PlayerSearchEntry[]> {
  const trimmedQuery = normalizeSearchQuery(query);
  if (!trimmedQuery) return [];

  const [partialHandleMatches, exactHandleMatch] = await Promise.all([
    prisma.profile.findMany({
      where: { username: { contains: trimmedQuery, mode: "insensitive" } },
      select: { id: true },
    }),
    // `username` is unique, but a case-insensitive compare isn't covered by
    // that index, so this is a findFirst rather than a findUnique.
    prisma.profile.findFirst({
      where: { username: { equals: trimmedQuery, mode: "insensitive" } },
      select: { id: true },
    }),
  ]);

  const players = await prisma.player.findMany({
    where: {
      status: PlayerStatus.ACTIVE,
      id: { not: viewerId },
      OR: [
        {
          visibility: Visibility.PUBLIC,
          OR: [
            { name: { contains: trimmedQuery, mode: "insensitive" } },
            { id: { in: partialHandleMatches.map((profile) => profile.id) } },
          ],
        },
        ...(exactHandleMatch
          ? [{ visibility: Visibility.PRIVATE, id: exactHandleMatch.id }]
          : []),
      ],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, roles: true, country: true },
  });

  if (!players.length) return [];

  const [profiles, connectionByOtherId] = await Promise.all([
    prisma.profile.findMany({
      where: { id: { in: players.map((player) => player.id) } },
      select: { id: true, username: true },
    }),
    getViewerConnectionsByOtherId(viewerId),
  ]);

  const usernames = new Map(profiles.map((profile) => [profile.id, profile.username]));

  return players.map((player) => {
    const connection = connectionByOtherId.get(player.id);

    return {
      id: player.id,
      name: player.name,
      username: usernames.get(player.id) ?? null,
      roles: player.roles,
      country: player.country,
      state: directoryState(viewerId, connection),
      connectionId: connection?.connectionId ?? null,
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

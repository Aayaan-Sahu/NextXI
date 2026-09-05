import "server-only";
import {
  ClubCoachRole,
  ClubStatus,
  CoachStatus,
  ConnectionStatus,
  PlayerStatus,
  PlayerVideoStatus,
} from "@/app/generated/prisma/enums";
import { normalizeClubName } from "@/lib/clubs";
import {
  directoryState,
  getAcceptedCounterpartIds,
  getViewerConnectionsByOtherId,
  type DirectoryConnectionState,
} from "@/lib/connections";
import { ageInYears } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import { publishedReportWhere } from "@/lib/report-review.server";

export type ClubViewer = "club" | "coach";

export type ClubAccess = {
  club: { id: string; name: string; country: string; status: ClubStatus; bio: string | null };
  /** Whose login this is: the club's own account, or a coach acting for it. */
  viewer: ClubViewer;
  role: ClubCoachRole | null;
};

/**
 * Who may open a club's dashboard: the club's own account, or a coach with an
 * accepted membership whose own coach account is approved.
 *
 * This is authorisation, not impersonation — there is no "act as" cookie and
 * no session swapping. A member coach stays themselves and simply has the
 * right to this page.
 */
export async function getClubAccess(userId: string, clubId: string): Promise<ClubAccess | null> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true, country: true, status: true, bio: true },
  });
  if (!club) return null;

  if (club.id === userId) return { club, viewer: "club", role: null };

  const membership = await prisma.clubCoach.findUnique({
    where: { clubId_coachId: { clubId, coachId: userId } },
    select: { role: true, status: true, coach: { select: { status: true } } },
  });

  if (
    membership?.status !== ConnectionStatus.ACCEPTED ||
    membership.coach.status !== CoachStatus.APPROVED
  ) {
    return null;
  }

  return { club, viewer: "coach", role: membership.role };
}

export type CoachClub = {
  id: string;
  name: string;
  country: string;
  status: ClubStatus;
  role: ClubCoachRole;
};

/** The clubs on a coach's home: ones they can act for, and ones still asking. */
export async function getCoachClubs(
  coachId: string,
): Promise<{ member: CoachClub[]; invited: CoachClub[] }> {
  const rows = await prisma.clubCoach.findMany({
    where: {
      coachId,
      status: { in: [ConnectionStatus.ACCEPTED, ConnectionStatus.PENDING] },
    },
    orderBy: { club: { name: "asc" } },
    select: {
      role: true,
      status: true,
      club: { select: { id: true, name: true, country: true, status: true } },
    },
  });

  const member: CoachClub[] = [];
  const invited: CoachClub[] = [];

  for (const row of rows) {
    const entry = { ...row.club, role: row.role };
    if (row.status === ConnectionStatus.ACCEPTED) member.push(entry);
    else invited.push(entry);
  }

  return { member, invited };
}

export type ClubRosterEntry = {
  id: string;
  name: string;
  age: number;
  roles: string[];
  videoCount: number;
  latestReportAt: Date | null;
};

/**
 * The players who have accepted the club. Report counts are published-only —
 * a club sees exactly what the player's own page shows, never a report still
 * waiting on a coach's sign-off.
 */
export async function getClubRoster(clubId: string): Promise<ClubRosterEntry[]> {
  const counterpartIds = await getAcceptedCounterpartIds(clubId);
  if (!counterpartIds.length) return [];

  const players = await prisma.player.findMany({
    where: { id: { in: counterpartIds }, status: PlayerStatus.ACTIVE },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      dateOfBirth: true,
      roles: true,
      _count: { select: { videos: { where: { status: PlayerVideoStatus.READY } } } },
      videos: {
        where: { report: { is: publishedReportWhere } },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { report: { select: { updatedAt: true } } },
      },
    },
  });

  return players.map((player) => ({
    id: player.id,
    name: player.name,
    age: ageInYears(player.dateOfBirth),
    roles: player.roles,
    videoCount: player._count.videos,
    latestReportAt: player.videos[0]?.report?.updatedAt ?? null,
  }));
}

export type ClaimablePlayer = { id: string; name: string; age: number; roles: string[] };

/**
 * Active, public players whose typed club name is this club's, and who the
 * club has never asked. The match is exact after trimming and collapsing
 * whitespace (lib/clubs.ts) — done in SQL because that normalisation has to
 * happen on the stored value, and Prisma's query API can't express it.
 *
 * Private profiles stay off this list: visibility copy promises the directory
 * (and this auto-match) only while the player is public. A club still reaches
 * someone private the same way anyone does — by username, one at a time.
 *
 * Anyone with any existing connection row is excluded, revoked included: a
 * player who said no should not reappear on the club's list next week.
 */
export async function getClaimablePlayers(clubId: string): Promise<ClaimablePlayer[]> {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } });
  if (!club) return [];

  const normalized = normalizeClubName(club.name);
  if (!normalized) return [];

  const [matches, connections] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`
      select p.id
      from public.players p
      where p.status = 'active'::public.player_status
        and p.visibility = 'public'::public.visibility
        and lower(btrim(regexp_replace(p.club, '\\s+', ' ', 'g'))) = ${normalized}
    `,
    prisma.connection.findMany({
      where: { OR: [{ userAId: clubId }, { userBId: clubId }] },
      select: { userAId: true, userBId: true },
    }),
  ]);

  const known = new Set(
    connections.map((row) => (row.userAId === clubId ? row.userBId : row.userAId)),
  );
  const ids = matches.map((row) => row.id).filter((id) => !known.has(id));
  if (!ids.length) return [];

  const players = await prisma.player.findMany({
    where: { id: { in: ids } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, dateOfBirth: true, roles: true },
  });

  return players.map((player) => ({
    id: player.id,
    name: player.name,
    age: ageInYears(player.dateOfBirth),
    roles: player.roles,
  }));
}

export type ClubCoachEntry = {
  id: string;
  name: string;
  username: string | null;
  role: ClubCoachRole;
  status: ConnectionStatus;
  certifications: string[];
};

/** The club's coaches: accepted members first, then invitations still open. */
export async function getClubCoaches(clubId: string): Promise<ClubCoachEntry[]> {
  const rows = await prisma.clubCoach.findMany({
    where: { clubId, status: { in: [ConnectionStatus.ACCEPTED, ConnectionStatus.PENDING] } },
    orderBy: [{ status: "asc" }, { coach: { name: "asc" } }],
    select: {
      role: true,
      status: true,
      coach: { select: { id: true, name: true, certifications: true } },
    },
  });

  if (!rows.length) return [];

  const profiles = await prisma.profile.findMany({
    where: { id: { in: rows.map((row) => row.coach.id) } },
    select: { id: true, username: true },
  });
  const usernames = new Map(profiles.map((profile) => [profile.id, profile.username]));

  return rows.map((row) => ({
    id: row.coach.id,
    name: row.coach.name,
    username: usernames.get(row.coach.id) ?? null,
    role: row.role,
    status: row.status,
    certifications: row.coach.certifications,
  }));
}

export type ClubDirectoryEntry = {
  id: string;
  name: string;
  username: string | null;
  country: string;
  bio: string | null;
  state: DirectoryConnectionState;
  connectionId: string | null;
};

/** Approved clubs for a player to find, with their state relative to the viewer. */
export async function getClubDirectory(
  viewerId: string,
  query?: string,
): Promise<ClubDirectoryEntry[]> {
  const trimmedQuery = query?.trim();

  const clubs = await prisma.club.findMany({
    where: {
      status: ClubStatus.APPROVED,
      id: { not: viewerId },
      ...(trimmedQuery ? { name: { contains: trimmedQuery, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, country: true, bio: true },
  });

  if (!clubs.length) return [];

  const [profiles, connectionByOtherId] = await Promise.all([
    prisma.profile.findMany({
      where: { id: { in: clubs.map((club) => club.id) } },
      select: { id: true, username: true },
    }),
    getViewerConnectionsByOtherId(viewerId),
  ]);

  const usernames = new Map(profiles.map((profile) => [profile.id, profile.username]));

  return clubs.map((club) => {
    const connection = connectionByOtherId.get(club.id);

    return {
      id: club.id,
      name: club.name,
      username: usernames.get(club.id) ?? null,
      country: club.country,
      bio: club.bio,
      state: directoryState(viewerId, connection),
      connectionId: connection?.connectionId ?? null,
    };
  });
}

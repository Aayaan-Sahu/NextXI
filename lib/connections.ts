import { CoachConnectionStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type ConnectionPerson = {
  coachId: string;
  name: string;
  playerId: string;
  username: string | null;
};

export type ConnectionPanelData = {
  accepted: ConnectionPerson[];
  incomingPending: ConnectionPerson[];
  outgoingPending: ConnectionPerson[];
  role: "player" | "coach";
};

export async function getConnectionPanelData(
  userId: string,
  role: "player" | "coach",
): Promise<ConnectionPanelData> {
  const data: ConnectionPanelData = {
    accepted: [],
    incomingPending: [],
    outgoingPending: [],
    role,
  };

  if (role === "player") {
    const rows = await prisma.coachConnection.findMany({
      where: { playerId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        coachId: true,
        playerId: true,
        requestedById: true,
        status: true,
        coach: {
          select: {
            name: true,
          },
        },
      },
    });
    const usernames = await usernamesById(rows.map((row) => row.coachId));

    for (const row of rows) {
      const person = {
        coachId: row.coachId,
        name: row.coach.name,
        playerId: row.playerId,
        username: usernames.get(row.coachId) ?? null,
      };

      if (row.status === CoachConnectionStatus.ACCEPTED) data.accepted.push(person);
      else if (row.requestedById === userId) data.outgoingPending.push(person);
      else data.incomingPending.push(person);
    }

    return data;
  }

  const rows = await prisma.coachConnection.findMany({
    where: { coachId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      coachId: true,
      playerId: true,
      requestedById: true,
      status: true,
        player: {
          select: {
            name: true,
          },
        },
      },
    });
  const usernames = await usernamesById(rows.map((row) => row.playerId));

  for (const row of rows) {
    const person = {
      coachId: row.coachId,
      name: row.player.name,
      playerId: row.playerId,
      username: usernames.get(row.playerId) ?? null,
    };

    if (row.status === CoachConnectionStatus.ACCEPTED) data.accepted.push(person);
    else if (row.requestedById === userId) data.outgoingPending.push(person);
    else data.incomingPending.push(person);
  }

  return data;
}

async function usernamesById(ids: string[]) {
  if (!ids.length) return new Map<string, string>();

  const profiles = await prisma.profile.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true },
  });

  return new Map(profiles.map((profile) => [profile.id, profile.username]));
}

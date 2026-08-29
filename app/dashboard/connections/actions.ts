"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ClubStatus, CoachStatus, ConnectionStatus, PlayerStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createConnectionRequest, type ConnectionRequestOutcome } from "@/lib/connections";
import { releaseOrphanedReports } from "@/lib/report-review.server";

const usernamePattern = /^[a-z0-9_]{3,30}$/;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function accountStatusFor(userId: string) {
  const [player, coach, club] = await Promise.all([
    prisma.player.findUnique({ where: { id: userId }, select: { status: true } }),
    prisma.coach.findUnique({ where: { id: userId }, select: { id: true, status: true } }),
    prisma.club.findUnique({ where: { id: userId }, select: { status: true } }),
  ]);

  if (player) return { clubStatus: null, coachStatus: null, playerStatus: player.status };
  if (coach) return { clubStatus: null, coachStatus: coach.status, playerStatus: null };
  if (club) return { clubStatus: club.status, coachStatus: null, playerStatus: null };
  redirect("/onboarding");
}

function requireActiveAccount(status: Awaited<ReturnType<typeof accountStatusFor>>) {
  if (status.coachStatus && status.coachStatus !== CoachStatus.APPROVED) {
    done("connectionError", "Your coach account is still under review.");
  }

  if (status.clubStatus && status.clubStatus !== ClubStatus.APPROVED) {
    done("connectionError", "Your club is still under review.");
  }

  if (status.playerStatus === PlayerStatus.PENDING_GUARDIAN) {
    done("connectionError", "Your account needs guardian approval first.");
  }
}

function done(key: "connectionError" | "connectionMessage", message: string): never {
  revalidatePath("/dashboard/connections");
  redirect(`/dashboard/connections?${key}=${encodeURIComponent(message)}`);
}

function finishConnectionRequest(outcome: ConnectionRequestOutcome): never {
  if ("error" in outcome) done("connectionError", outcome.error);
  done("connectionMessage", outcome.message);
}

export async function sendConnectionRequest(formData: FormData) {
  const user = await requireUser();
  requireActiveAccount(await accountStatusFor(user.id));

  const raw = text(formData, "query") || text(formData, "username");
  const query = raw.replace(/^@/, "");

  if (!query) done("connectionError", "Enter a name or username.");

  if (usernamePattern.test(query.toLowerCase())) {
    const byUsername = await prisma.profile.findUnique({
      where: { username: query.toLowerCase() },
      select: { id: true },
    });
    if (byUsername && byUsername.id !== user.id) {
      finishConnectionRequest(await createConnectionRequest(user.id, byUsername.id));
    }
  }

  const [players, coaches] = await Promise.all([
    prisma.player.findMany({
      where: { name: { equals: query, mode: "insensitive" } },
      select: { id: true, name: true },
    }),
    prisma.coach.findMany({
      where: { name: { equals: query, mode: "insensitive" } },
      select: { id: true, name: true },
    }),
  ]);

  const matches = [...players, ...coaches].filter((person) => person.id !== user.id);

  if (matches.length === 1) {
    finishConnectionRequest(await createConnectionRequest(user.id, matches[0].id));
  }

  if (matches.length > 1) {
    const profiles = await prisma.profile.findMany({
      where: { id: { in: matches.map((person) => person.id) } },
      select: { username: true },
    });
    const handles = profiles
      .map((profile) => (profile.username ? `@${profile.username}` : null))
      .filter(Boolean)
      .join(", ");
    done(
      "connectionError",
      handles
        ? `Several people match that name. Use one of: ${handles}.`
        : "Several people match that name. Ask for their @username.",
    );
  }

  done("connectionError", "No user found for that name or username.");
}

/** Connect action for the coach directory — same core as `sendConnectionRequest`. */
export async function requestConnectionToCoach(formData: FormData) {
  const user = await requireUser();
  requireActiveAccount(await accountStatusFor(user.id));

  const coachId = text(formData, "coachId");

  if (!coachId) {
    done("connectionError", "Coach not found.");
  }

  finishConnectionRequest(await createConnectionRequest(user.id, coachId));
}

/** Connect action for the player directory — same core as `sendConnectionRequest`. */
export async function requestConnectionToPlayer(formData: FormData) {
  const user = await requireUser();
  requireActiveAccount(await accountStatusFor(user.id));

  const playerId = text(formData, "playerId");

  if (!playerId) {
    done("connectionError", "Player not found.");
  }

  finishConnectionRequest(await createConnectionRequest(user.id, playerId));
}

export async function requestConnectionToClub(formData: FormData) {
  const user = await requireUser();
  requireActiveAccount(await accountStatusFor(user.id));

  const clubId = text(formData, "clubId");
  if (!clubId) done("connectionError", "Invalid request.");

  finishConnectionRequest(await createConnectionRequest(user.id, clubId));
}

export async function revokeConnection(formData: FormData) {
  const user = await requireUser();

  const connectionId = text(formData, "connectionId");

  if (!connectionId) {
    done("connectionError", "Connection not found.");
  }

  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { userAId: true, userBId: true, status: true },
  });

  const isParticipant =
    !!connection && (connection.userAId === user.id || connection.userBId === user.id);

  if (!connection || !isParticipant || connection.status !== ConnectionStatus.ACCEPTED) {
    done("connectionError", "Connection not found.");
  }

  await prisma.connection.update({
    where: { id: connectionId },
    data: { status: ConnectionStatus.REVOKED },
  });

  // A player whose last reviewing coach just left must not wait on a report
  // forever: release anything of theirs still awaiting review. A no-op for
  // whichever side isn't a player, and for players who still have a coach.
  await Promise.all([
    releaseOrphanedReports(connection.userAId),
    releaseOrphanedReports(connection.userBId),
  ]);

  // Revoking drops the pair's access to messaging immediately; refresh the
  // messages route too so a stale conversation doesn't linger in the sidebar.
  revalidatePath("/dashboard/messages");
  done("connectionMessage", "Connection revoked.");
}

export async function respondToConnectionRequest(formData: FormData) {
  const user = await requireUser();
  requireActiveAccount(await accountStatusFor(user.id));

  const connectionId = text(formData, "connectionId");
  const response = text(formData, "response");

  if (!connectionId || (response !== "accept" && response !== "decline")) {
    done("connectionError", "Invalid request.");
  }

  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { userAId: true, userBId: true, requestedById: true, status: true },
  });

  if (!connection || connection.status !== ConnectionStatus.PENDING) {
    done("connectionError", "Pending request not found.");
  }

  const isParticipant =
    connection.userAId === user.id || connection.userBId === user.id;

  if (!isParticipant || connection.requestedById === user.id) {
    done("connectionError", "Only the recipient can respond.");
  }

  if (response === "accept") {
    await prisma.connection.update({
      where: { id: connectionId },
      data: { status: ConnectionStatus.ACCEPTED },
    });
  } else {
    await prisma.connection.delete({ where: { id: connectionId } });
  }

  done("connectionMessage", response === "accept" ? "Request accepted." : "Request declined.");
}

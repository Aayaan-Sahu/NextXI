"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CoachStatus, ConnectionStatus, PlayerStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { orderedPair } from "@/lib/connections";

const usernamePattern = /^[a-z0-9_]{3,30}$/;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function accountStatusFor(userId: string) {
  const [player, coach] = await Promise.all([
    prisma.player.findUnique({ where: { id: userId }, select: { status: true } }),
    prisma.coach.findUnique({ where: { id: userId }, select: { id: true, status: true } }),
  ]);

  if (player) return { coachStatus: null, playerStatus: player.status };
  if (coach) return { coachStatus: coach.status, playerStatus: null };
  redirect("/onboarding");
}

function requireActiveAccount(status: Awaited<ReturnType<typeof accountStatusFor>>) {
  if (status.coachStatus && status.coachStatus !== CoachStatus.APPROVED) {
    done("connectionError", "Your coach account is still under review.");
  }

  if (status.playerStatus === PlayerStatus.PENDING_GUARDIAN) {
    done("connectionError", "Your account needs guardian approval first.");
  }
}

function done(key: "connectionError" | "connectionMessage", message: string): never {
  revalidatePath("/dashboard/connections");
  redirect(`/dashboard/connections?${key}=${encodeURIComponent(message)}`);
}

type ConnectionRequestOutcome = { message: string } | { error: string };

/**
 * Shared core for every "connect with this person" entry point (username
 * lookup, coach directory). Validates eligibility, then either creates a new
 * pending connection or, if the pair was previously revoked, reopens the
 * existing row — the `[userAId, userBId]` unique constraint means a revoked
 * pair can never be re-inserted.
 */
async function requestConnection(
  requesterId: string,
  targetId: string,
): Promise<ConnectionRequestOutcome> {
  if (targetId === requesterId) {
    return { error: "You can't connect with yourself." };
  }

  const [targetCoach, targetPlayer] = await Promise.all([
    prisma.coach.findUnique({
      where: { id: targetId },
      select: { status: true },
    }),
    prisma.player.findUnique({
      where: { id: targetId },
      select: { status: true },
    }),
  ]);

  if (targetCoach && targetCoach.status !== CoachStatus.APPROVED) {
    return { error: "That coach is not available to connect yet." };
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

function finishConnectionRequest(outcome: ConnectionRequestOutcome): never {
  if ("error" in outcome) done("connectionError", outcome.error);
  done("connectionMessage", outcome.message);
}

export async function sendConnectionRequest(formData: FormData) {
  const user = await requireUser();
  requireActiveAccount(await accountStatusFor(user.id));

  const username = text(formData, "username").toLowerCase();

  if (!usernamePattern.test(username)) {
    done("connectionError", "Enter a valid username.");
  }

  const target = await prisma.profile.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!target || target.id === user.id) {
    done("connectionError", "No user found for that username.");
  }

  finishConnectionRequest(await requestConnection(user.id, target.id));
}

/** Connect action for the coach directory — same core as `sendConnectionRequest`. */
export async function requestConnectionToCoach(formData: FormData) {
  const user = await requireUser();
  requireActiveAccount(await accountStatusFor(user.id));

  const coachId = text(formData, "coachId");

  if (!coachId) {
    done("connectionError", "Coach not found.");
  }

  finishConnectionRequest(await requestConnection(user.id, coachId));
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

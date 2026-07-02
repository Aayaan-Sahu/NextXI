"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CoachConnectionStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const usernamePattern = /^[a-z0-9_]{3,30}$/;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function roleFor(userId: string) {
  const [player, coach] = await Promise.all([
    prisma.player.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.coach.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);

  if (player) return "player" as const;
  if (coach) return "coach" as const;
  redirect("/onboarding");
}

function refreshDashboards() {
  revalidatePath("/dashboard/player");
  revalidatePath("/dashboard/coach");
}

function done(role: "player" | "coach", key: "connectionError" | "connectionMessage", message: string): never {
  redirect(`/dashboard/${role}?${key}=${encodeURIComponent(message)}`);
}

export async function sendConnectionRequest(formData: FormData) {
  const user = await requireUser();
  const role = await roleFor(user.id);
  const username = text(formData, "username").toLowerCase();

  if (!usernamePattern.test(username)) {
    done(role, "connectionError", "Enter a valid username.");
  }

  const target = await prisma.profile.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!target || target.id === user.id) {
    done(role, "connectionError", "No coach or player found for that username.");
  }

  const [targetPlayer, targetCoach] = await Promise.all([
    prisma.player.findUnique({ where: { id: target.id }, select: { id: true } }),
    prisma.coach.findUnique({ where: { id: target.id }, select: { id: true } }),
  ]);
  const targetRole = targetPlayer ? "player" : targetCoach ? "coach" : null;

  if (
    (role === "player" && targetRole !== "coach") ||
    (role === "coach" && targetRole !== "player")
  ) {
    done(role, "connectionError", "Requests must be between a player and a coach.");
  }

  const playerId = role === "player" ? user.id : target.id;
  const coachId = role === "coach" ? user.id : target.id;
  const existing = await prisma.coachConnection.findUnique({
    where: { playerId_coachId: { playerId, coachId } },
    select: { status: true },
  });

  if (existing) {
    done(
      role,
      "connectionError",
      existing.status === CoachConnectionStatus.ACCEPTED
        ? "That connection is already accepted."
        : "That request is already pending.",
    );
  }

  await prisma.coachConnection.create({
    data: {
      coachId,
      playerId,
      requestedById: user.id,
      status: CoachConnectionStatus.PENDING,
    },
  });

  refreshDashboards();
  done(role, "connectionMessage", "Request sent.");
}

export async function respondToConnectionRequest(formData: FormData) {
  const user = await requireUser();
  const role = await roleFor(user.id);
  const playerId = text(formData, "playerId");
  const coachId = text(formData, "coachId");
  const response = text(formData, "response");

  if (!playerId || !coachId || (response !== "accept" && response !== "decline")) {
    done(role, "connectionError", "Invalid request.");
  }

  const connection = await prisma.coachConnection.findUnique({
    where: { playerId_coachId: { playerId, coachId } },
    select: { requestedById: true, status: true },
  });

  if (!connection || connection.status !== CoachConnectionStatus.PENDING) {
    done(role, "connectionError", "Pending request not found.");
  }

  const receiverId = connection.requestedById === playerId ? coachId : playerId;

  if (receiverId !== user.id) {
    done(role, "connectionError", "Only the receiver can respond.");
  }

  if (response === "accept") {
    await prisma.coachConnection.update({
      where: { playerId_coachId: { playerId, coachId } },
      data: { status: CoachConnectionStatus.ACCEPTED },
    });
  } else {
    await prisma.coachConnection.delete({
      where: { playerId_coachId: { playerId, coachId } },
    });
  }

  refreshDashboards();
  done(role, "connectionMessage", response === "accept" ? "Request accepted." : "Request declined.");
}

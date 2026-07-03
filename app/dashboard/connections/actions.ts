"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CoachStatus, ConnectionStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { orderedPair } from "@/lib/connections";

const usernamePattern = /^[a-z0-9_]{3,30}$/;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function coachStatusFor(userId: string) {
  const [player, coach] = await Promise.all([
    prisma.player.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.coach.findUnique({ where: { id: userId }, select: { id: true, status: true } }),
  ]);

  if (player) return null;
  if (coach) return coach.status;
  redirect("/onboarding");
}

function done(key: "connectionError" | "connectionMessage", message: string): never {
  revalidatePath("/dashboard/connections");
  redirect(`/dashboard/connections?${key}=${encodeURIComponent(message)}`);
}

export async function sendConnectionRequest(formData: FormData) {
  const user = await requireUser();
  const coachStatus = await coachStatusFor(user.id);

  if (coachStatus && coachStatus !== CoachStatus.APPROVED) {
    done("connectionError", "Your coach account is still under review.");
  }

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

  const targetCoach = await prisma.coach.findUnique({
    where: { id: target.id },
    select: { status: true },
  });

  if (targetCoach && targetCoach.status !== CoachStatus.APPROVED) {
    done("connectionError", "That coach is not available to connect yet.");
  }

  const [userAId, userBId] = orderedPair(user.id, target.id);
  const existing = await prisma.connection.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { status: true },
  });

  if (existing) {
    done(
      "connectionError",
      existing.status === ConnectionStatus.ACCEPTED
        ? "You are already connected."
        : "That request is already pending.",
    );
  }

  await prisma.connection.create({
    data: {
      userAId,
      userBId,
      requestedById: user.id,
      status: ConnectionStatus.PENDING,
    },
  });

  done("connectionMessage", "Request sent.");
}

export async function respondToConnectionRequest(formData: FormData) {
  const user = await requireUser();
  const coachStatus = await coachStatusFor(user.id);

  if (coachStatus && coachStatus !== CoachStatus.APPROVED) {
    done("connectionError", "Your coach account is still under review.");
  }

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

"use server";

import { revalidatePath } from "next/cache";
import { CoachStatus, PlayerStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  authorizeConversation,
  markConversationRead,
  type ThreadMessage,
} from "@/lib/messages";

export type SendMessageResult =
  | { ok: true; message: ThreadMessage }
  | { ok: false; error: string };

export async function sendMessage(
  connectionId: string,
  body: string,
): Promise<SendMessageResult> {
  const user = await requireUser();

  const trimmed = typeof body === "string" ? body.trim() : "";
  if (typeof connectionId !== "string" || !connectionId) {
    return { ok: false, error: "Conversation not found." };
  }
  if (!trimmed || trimmed.length > 4000) {
    return { ok: false, error: "Enter a message up to 4000 characters." };
  }

  // Authorization: sender must be a participant of an accepted connection.
  const connection = await authorizeConversation(user.id, connectionId);
  if (!connection) return { ok: false, error: "Conversation not found." };

  // A coach under review or a player awaiting guardian approval cannot send messages.
  const [coach, player] = await Promise.all([
    prisma.coach.findUnique({
      where: { id: user.id },
      select: { status: true },
    }),
    prisma.player.findUnique({
      where: { id: user.id },
      select: { status: true },
    }),
  ]);
  if (coach && coach.status !== CoachStatus.APPROVED) {
    return { ok: false, error: "Your account is pending approval." };
  }
  if (player && player.status === PlayerStatus.PENDING_GUARDIAN) {
    return { ok: false, error: "Your account is pending guardian approval." };
  }

  const message = await prisma.message.create({
    data: { connectionId, senderId: user.id, body: trimmed },
  });

  return {
    ok: true,
    message: {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      fromMe: true,
      readAt: null,
    },
  };
}

export async function markThreadRead(connectionId: string) {
  const user = await requireUser();

  if (typeof connectionId !== "string" || !connectionId) return;

  // Authorization: only participants of an accepted connection may mark it read.
  const connection = await authorizeConversation(user.id, connectionId);
  if (!connection) return;

  await markConversationRead(user.id, connectionId);

  // The layout's unread badge reads this state — refresh the whole tree.
  revalidatePath("/dashboard", "layout");
}

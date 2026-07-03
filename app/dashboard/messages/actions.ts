"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CoachStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { authorizeConversation } from "@/lib/messages";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function sendMessage(formData: FormData) {
  const user = await requireUser();
  const connectionId = text(formData, "connectionId");
  const body = text(formData, "body");

  if (!connectionId) redirect("/dashboard/messages");

  const threadPath = `/dashboard/messages/${connectionId}`;

  if (!body || body.length > 4000) {
    redirect(`${threadPath}?error=${encodeURIComponent("Enter a message up to 4000 characters.")}`);
  }

  // Authorization: sender must be a participant of an accepted connection.
  const connection = await authorizeConversation(user.id, connectionId);
  if (!connection) redirect("/dashboard/messages");

  // A coach whose account is not approved cannot send messages.
  const coach = await prisma.coach.findUnique({
    where: { id: user.id },
    select: { status: true },
  });
  if (coach && coach.status !== CoachStatus.APPROVED) redirect("/dashboard");

  await prisma.message.create({
    data: { connectionId, senderId: user.id, body },
  });

  revalidatePath(threadPath);
  redirect(threadPath);
}

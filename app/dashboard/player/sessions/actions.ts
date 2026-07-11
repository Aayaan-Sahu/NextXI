"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { VideoCategory } from "@/app/generated/prisma/enums";
import { isUuid } from "@/app/api/videos/utils";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVideoDiscipline } from "@/lib/videos";

const MAX_SESSION_NAME = 120;

function cleanName(value: FormDataEntryValue | null) {
  return (value ?? "").toString().trim().slice(0, MAX_SESSION_NAME);
}

export async function createSession(formData: FormData) {
  const user = await requireUser();
  const name = cleanName(formData.get("name"));
  const category = formData.get("category");
  if (!name || !isVideoDiscipline(category)) return;

  const session = await prisma.practiceSession.create({
    data: { playerId: user.id, name, category: VideoCategory[category] },
    select: { id: true },
  });

  redirect(`/dashboard/player/sessions/${session.id}`);
}

export async function renameSession(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");
  const name = cleanName(formData.get("name"));
  if (!isUuid(id) || !name) return;

  await prisma.practiceSession.updateMany({ where: { id, playerId: user.id }, data: { name } });
  revalidatePath(`/dashboard/player/sessions/${id}`);
}

export async function deleteSession(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id");
  if (!isUuid(id)) return;

  // FK is ON DELETE SET NULL, so member videos survive as standalone.
  await prisma.practiceSession.deleteMany({ where: { id, playerId: user.id } });
  revalidatePath("/dashboard/player");
  redirect("/dashboard/player/sessions");
}

export async function assignVideoToSession(formData: FormData) {
  const user = await requireUser();
  const videoId = formData.get("videoId");
  const sessionId = formData.get("sessionId");
  if (!isUuid(videoId) || !isUuid(sessionId)) return;

  const [session, video] = await Promise.all([
    prisma.practiceSession.findFirst({
      where: { id: sessionId, playerId: user.id },
      select: { category: true },
    }),
    prisma.playerVideo.findFirst({
      where: { id: videoId, playerId: user.id },
      select: { category: true },
    }),
  ]);
  // Exact-category lock: a video can only join a session of its own discipline.
  if (!session || !video || video.category !== session.category) return;

  await prisma.playerVideo.update({ where: { id: videoId }, data: { sessionId } });
  revalidatePath(`/dashboard/player/sessions/${sessionId}`);
  revalidatePath("/dashboard/player");
}

export async function removeVideoFromSession(formData: FormData) {
  const user = await requireUser();
  // `id` (not `videoId`) so this drops straight into VideoGrid's action slot.
  const videoId = formData.get("id");
  if (!isUuid(videoId)) return;

  const video = await prisma.playerVideo.findFirst({
    where: { id: videoId, playerId: user.id },
    select: { sessionId: true },
  });

  await prisma.playerVideo.updateMany({
    where: { id: videoId, playerId: user.id },
    data: { sessionId: null },
  });

  if (video?.sessionId) revalidatePath(`/dashboard/player/sessions/${video.sessionId}`);
  revalidatePath("/dashboard/player");
}

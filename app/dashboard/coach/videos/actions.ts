"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import { CoachStatus, PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { getProfile, requireUser } from "@/lib/auth";
import { hasAcceptedConnection } from "@/lib/connections";
import { prisma } from "@/lib/prisma";

const MAX_COMMENT_LENGTH = 2000;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function done(videoId: string, error?: string): never {
  revalidatePath(`/dashboard/coach/videos/${videoId}`);
  revalidatePath(`/dashboard/player/videos/${videoId}`);
  redirect(
    error
      ? `/dashboard/coach/videos/${videoId}?commentError=${encodeURIComponent(error)}`
      : `/dashboard/coach/videos/${videoId}`,
  );
}

export async function addVideoComment(formData: FormData) {
  const user = await requireUser();

  const videoId = text(formData, "videoId");
  if (!isUuid(videoId)) redirect("/dashboard/coach");

  const body = text(formData, "body");
  if (!body || body.length > MAX_COMMENT_LENGTH) {
    done(videoId, `Enter feedback up to ${MAX_COMMENT_LENGTH} characters.`);
  }

  // Authorization: only approved coaches connected to the video's player may comment.
  const profile = await getProfile(user.id);
  if (profile.role !== "coach" || profile.coach.status !== CoachStatus.APPROVED) {
    redirect("/dashboard");
  }
  if (!profile.username) {
    done(videoId, "Complete your profile before leaving feedback.");
  }

  const video = await prisma.playerVideo.findFirst({
    where: { id: videoId, status: PlayerVideoStatus.READY },
    select: { playerId: true },
  });
  if (!video || !(await hasAcceptedConnection(user.id, video.playerId))) {
    redirect("/dashboard/coach");
  }

  await prisma.videoComment.create({
    data: {
      videoId,
      authorId: user.id,
      authorUsername: profile.username,
      authorName: profile.coach.name,
      body,
    },
  });

  done(videoId);
}

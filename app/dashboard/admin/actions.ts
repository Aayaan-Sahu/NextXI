"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import { CoachStatus, ReportReviewStatus, ReportStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { publishReport, revalidateReportSurfaces } from "@/lib/report-review.server";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function done(key: "error" | "message", value: string): never {
  redirect(`/dashboard/admin?${key}=${encodeURIComponent(value)}`);
}

async function setCoachStatus(formData: FormData, status: CoachStatus, message: string) {
  await requireAdmin();

  const coachId = text(formData, "coachId");
  if (!coachId) done("error", "Invalid request.");

  const result = await prisma.coach.updateMany({
    where: { id: coachId, status: CoachStatus.PENDING },
    data: { status },
  });

  if (result.count === 0) done("error", "That coach is no longer pending.");

  revalidatePath("/dashboard/admin");
  done("message", message);
}

export async function approveCoach(formData: FormData) {
  await setCoachStatus(formData, CoachStatus.APPROVED, "Coach approved.");
}

export async function rejectCoach(formData: FormData) {
  await setCoachStatus(formData, CoachStatus.REJECTED, "Coach rejected.");
}

/** The held report's video, for the surfaces to refresh; away if it isn't one. */
async function requireHeldVideo(formData: FormData) {
  const videoId = text(formData, "videoId");
  if (!isUuid(videoId)) done("error", "Invalid request.");
  const video = await prisma.playerVideo.findUnique({
    where: { id: videoId },
    select: { playerId: true, sessionId: true },
  });
  if (!video) done("error", "Invalid request.");
  return { videoId, playerId: video.playerId, sessionId: video.sessionId };
}

/**
 * Publish a held (or long-waiting) report without a coach's stamp. RELEASED,
 * never APPROVED: the sign-off on a report is a coach's, and an admin is not
 * one. The admin is recorded for the audit trail only.
 */
export async function releaseHeldReport(formData: FormData) {
  const user = await requireAdmin();
  const { videoId, playerId, sessionId } = await requireHeldVideo(formData);

  const released = await prisma.$transaction((tx) =>
    publishReport(tx, {
      videoId,
      reviewStatus: ReportReviewStatus.RELEASED,
      reviewedById: user.id,
      reviewedByName: null,
    }),
  );
  if (!released) done("error", "That report is no longer held.");

  revalidateReportSurfaces({ videoId, playerId, sessionId });
  done("message", "Report released to the player.");
}

/**
 * Send a held report back through the pipeline: the worker re-claims a
 * PENDING row, and when the new analysis lands the ingest moves it from HELD
 * to the coach's queue (lib/report-review.ts).
 */
export async function rerunHeldReport(formData: FormData) {
  await requireAdmin();
  const { videoId, playerId, sessionId } = await requireHeldVideo(formData);

  const { count } = await prisma.report.updateMany({
    where: { videoId, status: ReportStatus.READY, reviewStatus: ReportReviewStatus.HELD },
    data: { status: ReportStatus.PENDING, attempts: 0, claimedAt: null, error: null },
  });
  if (count === 0) done("error", "That report is no longer held.");

  revalidateReportSurfaces({ videoId, playerId, sessionId });
  done("message", "Analysis queued again.");
}

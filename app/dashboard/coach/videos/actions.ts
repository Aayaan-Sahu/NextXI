"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import {
  CoachStatus,
  PlayerVideoStatus,
  ReportReviewStatus,
  ReportStatus,
} from "@/app/generated/prisma/enums";
import { getProfile, requireUser } from "@/lib/auth";
import { hasAcceptedConnection } from "@/lib/connections";
import { notifyTeam } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import {
  isReportPublished,
  MAX_COACH_NOTE_LENGTH,
  MAX_HOLD_REASON_LENGTH,
  UNPUBLISHED_REVIEW_STATUSES,
} from "@/lib/report-review";
import { publishReport, revalidateReportSurfaces } from "@/lib/report-review.server";

const MAX_COMMENT_LENGTH = 2000;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function firstName(name: string) {
  return name.split(" ")[0] || name;
}

type Outcome = { key: "commentError" | "reviewError" | "message"; value: string };

function done(videoId: string, outcome?: Outcome): never {
  revalidatePath(`/dashboard/coach/videos/${videoId}`);
  revalidatePath(`/dashboard/player/videos/${videoId}`);
  revalidatePath(`/dashboard/guardian/videos/${videoId}`);
  revalidatePath("/dashboard/player");
  redirect(
    outcome
      ? `/dashboard/coach/videos/${videoId}?${outcome.key}=${encodeURIComponent(outcome.value)}`
      : `/dashboard/coach/videos/${videoId}`,
  );
}

/**
 * Authorization shared by every write on a video: an approved coach with an
 * accepted connection to the video's player, on a video that finished
 * uploading. Anything else is sent away.
 */
async function requireReviewer(videoId: string) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (profile.role !== "coach" || profile.coach.status !== CoachStatus.APPROVED) {
    redirect("/dashboard");
  }

  const video = await prisma.playerVideo.findFirst({
    where: { id: videoId, status: PlayerVideoStatus.READY },
    select: {
      playerId: true,
      sessionId: true,
      player: { select: { name: true } },
      report: { select: { status: true, reviewStatus: true } },
    },
  });
  if (!video || !(await hasAcceptedConnection(user.id, video.playerId))) {
    redirect("/dashboard/coach");
  }

  return { user, profile, video };
}

function markViewed(
  tx: { videoView: typeof prisma.videoView },
  videoId: string,
  viewerId: string,
) {
  return tx.videoView.upsert({
    where: { videoId_viewerId: { videoId, viewerId } },
    update: {},
    create: { videoId, viewerId },
  });
}

export async function addVideoComment(formData: FormData) {
  const videoId = text(formData, "videoId");
  if (!isUuid(videoId)) redirect("/dashboard/coach");

  const body = text(formData, "body");
  if (!body || body.length > MAX_COMMENT_LENGTH) {
    done(videoId, {
      key: "commentError",
      value: `Enter feedback up to ${MAX_COMMENT_LENGTH} characters.`,
    });
  }

  // "Pin to 0:04" sends the clip position; absent when the switch is off.
  const rawTimestamp = text(formData, "timestampSec");
  const timestampSec = rawTimestamp === "" ? null : Math.round(Number(rawTimestamp) * 10) / 10;
  if (timestampSec !== null && (!Number.isFinite(timestampSec) || timestampSec < 0)) {
    done(videoId, { key: "commentError", value: "That timestamp isn't valid." });
  }

  const { user, profile, video } = await requireReviewer(videoId);
  if (!profile.username) {
    done(videoId, { key: "commentError", value: "Complete your profile before leaving feedback." });
  }

  // A note on a report that is delivered but not yet signed off is held with
  // it and released by the approval. Anything else — no report yet, a failed
  // one, a published one — is live at once, as feedback always was.
  const heldForReview =
    video.report?.status === ReportStatus.READY && !isReportPublished(video.report);
  const now = new Date();

  const comment = await prisma.videoComment.create({
    data: {
      videoId,
      authorId: user.id,
      authorUsername: profile.username,
      authorName: profile.coach.name,
      body,
      timestampSec,
      publishedAt: heldForReview ? null : now,
    },
    select: { id: true },
  });

  if (heldForReview) {
    // The report was under review when we looked but may have published in
    // between; don't leave this one note hidden behind a report the player has.
    const report = await prisma.report.findUnique({
      where: { videoId },
      select: { status: true, reviewStatus: true },
    });
    if (isReportPublished(report)) {
      await prisma.videoComment.update({ where: { id: comment.id }, data: { publishedAt: now } });
    }
  }

  done(videoId);
}

export async function approveReport(formData: FormData) {
  const videoId = text(formData, "videoId");
  if (!isUuid(videoId)) redirect("/dashboard/coach");

  const note = text(formData, "note");
  if (note.length > MAX_COACH_NOTE_LENGTH) {
    done(videoId, {
      key: "reviewError",
      value: `Keep your note to ${MAX_COACH_NOTE_LENGTH} characters.`,
    });
  }

  const { user, profile, video } = await requireReviewer(videoId);

  // publishReport is conditional on the report still awaiting sign-off, so
  // the second of two coaches approving at once simply finds nothing to do.
  const published = await prisma.$transaction(async (tx) => {
    const ok = await publishReport(tx, {
      videoId,
      reviewStatus: ReportReviewStatus.APPROVED,
      reviewedById: user.id,
      reviewedByName: profile.coach.name,
      coachNote: note || null,
    });
    if (ok) await markViewed(tx, videoId, user.id);
    return ok;
  });

  revalidateReportSurfaces({ videoId, playerId: video.playerId, sessionId: video.sessionId });

  if (!published) {
    done(videoId, {
      key: "reviewError",
      value: "This report is no longer awaiting your approval.",
    });
  }
  done(videoId, {
    key: "message",
    value: `Report approved. ${firstName(video.player.name)} can see it now.`,
  });
}

export async function holdReport(formData: FormData) {
  const videoId = text(formData, "videoId");
  if (!isUuid(videoId)) redirect("/dashboard/coach");

  const reason = text(formData, "reason");
  if (!reason || reason.length > MAX_HOLD_REASON_LENGTH) {
    done(videoId, {
      key: "reviewError",
      value: `Say why you're holding this report, up to ${MAX_HOLD_REASON_LENGTH} characters.`,
    });
  }

  const { user, profile, video } = await requireReviewer(videoId);

  // HELD -> HELD is allowed so a coach can revise the reason.
  const held = await prisma.$transaction(async (tx) => {
    const { count } = await tx.report.updateMany({
      where: {
        videoId,
        status: ReportStatus.READY,
        reviewStatus: { in: [...UNPUBLISHED_REVIEW_STATUSES] },
      },
      data: {
        reviewStatus: ReportReviewStatus.HELD,
        reviewedById: user.id,
        reviewedByName: profile.coach.name,
        reviewedAt: new Date(),
        holdReason: reason,
        coachNote: null,
      },
    });
    if (count > 0) await markViewed(tx, videoId, user.id);
    return count > 0;
  });

  revalidateReportSurfaces({ videoId, playerId: video.playerId, sessionId: video.sessionId });

  if (!held) {
    done(videoId, {
      key: "reviewError",
      value: "This report is no longer awaiting your approval.",
    });
  }

  // The admin queue lists held reports; the ops channel hears about it too.
  await notifyTeam(
    `Report held by ${profile.coach.name} for ${video.player.name}: ${reason} — see /dashboard/admin (video ${videoId})`,
  );

  done(videoId, {
    key: "message",
    value: `Report held. ${firstName(video.player.name)} sees "With your coach" until you approve.`,
  });
}

import "server-only";
import type { Prisma } from "@/app/generated/prisma/client";
import { PlayerVideoStatus, ReportStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatVideoTags, VIDEO_BUCKET } from "@/lib/videos";

const THUMBNAIL_URL_TTL_SECONDS = 60 * 60;

/** The coaching-report fields the detail views need, shaped for ReportPanel. */
export type VideoReport = {
  status: ReportStatus;
  schemaVersion: number | null;
  payload: Prisma.JsonValue | null;
  error: string | null;
  modelVersion: string | null;
  updatedAt: Date;
};

/** The AI coaching report for a video, or null if no slot has been created yet. */
export async function getVideoReport(videoId: string): Promise<VideoReport | null> {
  return prisma.report.findUnique({
    where: { videoId },
    select: {
      status: true,
      schemaVersion: true,
      payload: true,
      error: true,
      modelVersion: true,
      updatedAt: true,
    },
  });
}

/**
 * A player's standalone ready videos with signed thumbnail URLs, shaped for
 * VideoGrid. Videos filed under a practice session are shown on the session
 * page instead, so they're excluded here.
 */
export async function getReadyVideoGridItems(playerId: string) {
  const videos = await prisma.playerVideo.findMany({
    where: {
      playerId,
      status: PlayerVideoStatus.READY,
      sessionId: null,
    },
    orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
    select: {
      category: true,
      createdAt: true,
      handedness: true,
      id: true,
      originalFilename: true,
      sizeBytes: true,
      thumbnailPath: true,
      uploadedAt: true,
      variation: true,
    },
  });

  const thumbnailUrlByPath = await getThumbnailUrlByPath(
    videos.flatMap((video) => video.thumbnailPath ?? []),
  );

  return videos.map((video) => ({
    ...video,
    tagLabel: formatVideoTags(video.category, video.variation, video.handedness),
    thumbnailUrl: video.thumbnailPath
      ? (thumbnailUrlByPath.get(video.thumbnailPath) ?? null)
      : null,
  }));
}

/** Batch-signs thumbnail storage paths, returning a path → signed URL map. */
export async function getThumbnailUrlByPath(
  thumbnailPaths: string[],
): Promise<Map<string, string>> {
  if (!thumbnailPaths.length) return new Map();

  const { data: signed } = await createSupabaseAdminClient()
    .storage.from(VIDEO_BUCKET)
    .createSignedUrls(thumbnailPaths, THUMBNAIL_URL_TTL_SECONDS);

  const urlByPath = new Map<string, string>();
  for (const entry of signed ?? []) {
    if (!entry.error && entry.path && entry.signedUrl) {
      urlByPath.set(entry.path, entry.signedUrl);
    }
  }
  return urlByPath;
}

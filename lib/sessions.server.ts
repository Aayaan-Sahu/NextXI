import "server-only";
import { PlayerVideoStatus, ReportStatus, VideoCategory } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { formatVideoTags } from "@/lib/videos";
import { getThumbnailUrlByPath } from "@/lib/videos.server";

/** A player's practice sessions with a cover thumbnail + video count, for the index. */
export async function getPlayerSessions(playerId: string) {
  const sessions = await prisma.practiceSession.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      category: true,
      createdAt: true,
      _count: { select: { videos: true } },
      videos: {
        where: { status: PlayerVideoStatus.READY, thumbnailPath: { not: null } },
        orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { thumbnailPath: true },
      },
    },
  });

  const coverPaths = sessions.flatMap((session) => session.videos[0]?.thumbnailPath ?? []);
  const urlByPath = await getThumbnailUrlByPath(coverPaths);

  return sessions.map((session) => {
    const coverPath = session.videos[0]?.thumbnailPath ?? null;
    return {
      id: session.id,
      name: session.name,
      category: session.category,
      createdAt: session.createdAt,
      videoCount: session._count.videos,
      coverUrl: coverPath ? (urlByPath.get(coverPath) ?? null) : null,
    };
  });
}

/**
 * One session with its ready videos shaped for VideoGrid, plus the ready
 * reports' payloads for the consistency calc, and the owner's identity. Pass
 * `playerId` to scope to the owner (player view); omit it for a viewer (coach)
 * who authorizes via the returned `playerId`. Null if not found.
 */
export async function getSessionWithVideos(sessionId: string, playerId?: string) {
  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, ...(playerId ? { playerId } : {}) },
    select: {
      id: true,
      name: true,
      category: true,
      createdAt: true,
      playerId: true,
      player: { select: { name: true } },
      videos: {
        where: { status: PlayerVideoStatus.READY },
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
          report: { select: { status: true, payload: true } },
        },
      },
    },
  });

  if (!session) return null;

  const thumbnailUrlByPath = await getThumbnailUrlByPath(
    session.videos.flatMap((video) => video.thumbnailPath ?? []),
  );

  const videos = session.videos.map((video) => ({
    id: video.id,
    originalFilename: video.originalFilename,
    sizeBytes: video.sizeBytes,
    createdAt: video.createdAt,
    uploadedAt: video.uploadedAt,
    tagLabel: formatVideoTags(video.category, video.variation, video.handedness),
    thumbnailUrl: video.thumbnailPath
      ? (thumbnailUrlByPath.get(video.thumbnailPath) ?? null)
      : null,
  }));

  const readyPayloads = session.videos.flatMap((video) =>
    video.report && video.report.status === ReportStatus.READY && video.report.payload != null
      ? [video.report.payload]
      : [],
  );

  return {
    id: session.id,
    name: session.name,
    category: session.category,
    createdAt: session.createdAt,
    playerId: session.playerId,
    playerName: session.player.name,
    videos,
    readyPayloads,
  };
}

/** The player's standalone ready videos matching a session's category (assign picker). */
export async function getAssignableVideos(playerId: string, category: VideoCategory) {
  const videos = await prisma.playerVideo.findMany({
    where: { playerId, status: PlayerVideoStatus.READY, sessionId: null, category },
    orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      originalFilename: true,
      variation: true,
      handedness: true,
      category: true,
    },
  });

  return videos.map((video) => ({
    id: video.id,
    originalFilename: video.originalFilename,
    tagLabel: formatVideoTags(video.category, video.variation, video.handedness),
  }));
}

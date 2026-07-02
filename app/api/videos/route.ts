import { PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { getApiPlayer } from "@/app/api/videos/utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getApiPlayer();
  if (auth.response) return auth.response;

  const videos = await prisma.playerVideo.findMany({
    where: {
      playerId: auth.user.id,
      status: PlayerVideoStatus.READY,
    },
    orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
    select: {
      contentType: true,
      createdAt: true,
      id: true,
      originalFilename: true,
      sizeBytes: true,
      status: true,
      uploadedAt: true,
    },
  });

  return Response.json({
    videos: videos.map((video) => ({
      id: video.id,
      originalFilename: video.originalFilename,
      contentType: video.contentType,
      sizeBytes: video.sizeBytes,
      status: video.status,
      uploadedAt: video.uploadedAt?.toISOString() ?? null,
      createdAt: video.createdAt.toISOString(),
    })),
  });
}

import { revalidatePath } from "next/cache";
import { PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { getApiPlayer, isUuid, jsonError } from "@/app/api/videos/utils";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildPlayerVideoThumbnailPath } from "@/lib/videos";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getApiPlayer();
  if (auth.response) return auth.response;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const { videoId } = body as { videoId?: unknown };

  if (!isUuid(videoId)) {
    return jsonError("videoId must be a UUID.", 400);
  }

  const video = await prisma.playerVideo.findFirst({
    where: {
      id: videoId,
      playerId: auth.user.id,
    },
  });

  if (!video) return jsonError("Video not found.", 404);

  if (video.status === PlayerVideoStatus.READY) {
    return Response.json({
      video: {
        id: video.id,
        status: video.status,
        uploadedAt: video.uploadedAt?.toISOString() ?? video.createdAt.toISOString(),
      },
    });
  }

  let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;

  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch {
    return jsonError("Upload service is not configured.", 500);
  }

  const { error } = await supabaseAdmin.storage
    .from(video.storageBucket)
    .info(video.storagePath);

  if (error) {
    if (error.status === 400 || error.status === 404) {
      return jsonError("Upload has not finished.", 409);
    }

    return jsonError("Could not verify upload.", 500);
  }

  // Record the thumbnail only if the client actually uploaded one.
  const thumbnailPath = buildPlayerVideoThumbnailPath(video.playerId, video.id);
  const thumbnailInfo = await supabaseAdmin.storage
    .from(video.storageBucket)
    .info(thumbnailPath);

  const updated = await prisma.playerVideo.update({
    where: { id: video.id },
    data: {
      status: PlayerVideoStatus.READY,
      uploadedAt: new Date(),
      thumbnailPath: thumbnailInfo.error ? null : thumbnailPath,
    },
    select: {
      id: true,
      status: true,
      uploadedAt: true,
      sessionId: true,
    },
  });

  // Reserve the coaching-report slot for the AI pipeline to fill in later.
  // Idempotent: a repeated completion never creates a second report row.
  await prisma.report.upsert({
    where: { videoId: updated.id },
    update: {},
    create: { videoId: updated.id },
  });

  // Keep both the dashboard (standalone videos) and the session page fresh, so a
  // video never lingers in the wrong list after being filed into a session.
  revalidatePath("/dashboard/player");
  if (updated.sessionId) {
    revalidatePath(`/dashboard/player/sessions/${updated.sessionId}`);
  }

  return Response.json({
    video: {
      id: updated.id,
      status: updated.status,
      uploadedAt: updated.uploadedAt?.toISOString() ?? new Date().toISOString(),
    },
  });
}

import { Handedness, PlayerVideoStatus, VideoCategory } from "@/app/generated/prisma/enums";
import { getApiPlayer, jsonError } from "@/app/api/videos/utils";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_VIDEO_TYPES,
  buildPlayerVideoPath,
  buildPlayerVideoThumbnailPath,
  getSupabaseTusEndpoint,
  isHandedness,
  isVariationOf,
  isVideoDiscipline,
  MAX_VIDEO_SIZE_BYTES,
  TUS_CHUNK_SIZE_BYTES,
  VIDEO_BUCKET,
  VIDEO_CACHE_CONTROL,
} from "@/lib/videos";

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

  const { category, contentType, handedness, originalFilename, sizeBytes, variation } = body as {
    category?: unknown;
    contentType?: unknown;
    handedness?: unknown;
    originalFilename?: unknown;
    sizeBytes?: unknown;
    variation?: unknown;
  };
  const trimmedFilename =
    typeof originalFilename === "string" ? originalFilename.trim().slice(0, 255) : "";

  if (!trimmedFilename) return jsonError("originalFilename is required.", 400);
  if (typeof contentType !== "string" || !(contentType in ALLOWED_VIDEO_TYPES)) {
    return jsonError("Unsupported video type.", 400);
  }
  if (
    !Number.isInteger(sizeBytes) ||
    typeof sizeBytes !== "number" ||
    sizeBytes <= 0 ||
    sizeBytes > MAX_VIDEO_SIZE_BYTES
  ) {
    return jsonError("Invalid video size.", 400);
  }
  if (!isVideoDiscipline(category)) return jsonError("Invalid discipline.", 400);
  if (!isVariationOf(category, variation)) {
    return jsonError("Invalid variation for this discipline.", 400);
  }
  if (!isHandedness(handedness)) return jsonError("Invalid handedness.", 400);

  const videoId = crypto.randomUUID();
  const storagePath = buildPlayerVideoPath(auth.user.id, videoId, contentType);
  let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  let tusEndpoint: string;

  try {
    supabaseAdmin = createSupabaseAdminClient();
    tusEndpoint = getSupabaseTusEndpoint();
  } catch {
    return jsonError("Upload service is not configured.", 500);
  }

  const video = await prisma.playerVideo.create({
    data: {
      id: videoId,
      playerId: auth.user.id,
      storageBucket: VIDEO_BUCKET,
      storagePath,
      originalFilename: trimmedFilename,
      contentType,
      sizeBytes,
      category: VideoCategory[category],
      variation,
      handedness: Handedness[handedness],
      status: PlayerVideoStatus.PENDING_UPLOAD,
    },
    select: {
      createdAt: true,
      id: true,
      status: true,
    },
  });

  const { data, error } = await supabaseAdmin.storage
    .from(VIDEO_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (error) {
    await prisma.playerVideo.delete({ where: { id: videoId } }).catch(() => null);
    return jsonError("Could not authorize upload.", 500);
  }

  // Thumbnails are best-effort: the video upload proceeds even if signing fails.
  const { data: thumbnailData } = await supabaseAdmin.storage
    .from(VIDEO_BUCKET)
    .createSignedUploadUrl(buildPlayerVideoThumbnailPath(auth.user.id, videoId), {
      upsert: true,
    });

  return Response.json(
    {
      video: {
        id: video.id,
        status: video.status,
        createdAt: video.createdAt.toISOString(),
      },
      upload: {
        bucket: VIDEO_BUCKET,
        path: storagePath,
        token: data.token,
        signedUrl: data.signedUrl,
        tusEndpoint,
        chunkSize: TUS_CHUNK_SIZE_BYTES,
        cacheControl: VIDEO_CACHE_CONTROL,
      },
      thumbnailUpload: thumbnailData ? { signedUrl: thumbnailData.signedUrl } : null,
    },
    { status: 201 },
  );
}

import { jsonError } from "@/app/api/videos/utils";
import { getCurrentUser } from "@/lib/auth";
import { ALLOWED_AVATAR_TYPES, AVATAR_BUCKET, MAX_AVATAR_SIZE_BYTES, buildAvatarPath } from "@/lib/avatars";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Authentication required.", 401);

  const [player, coach] = await Promise.all([
    prisma.player.findUnique({ where: { id: user.id }, select: { id: true } }),
    prisma.coach.findUnique({ where: { id: user.id }, select: { id: true } }),
  ]);
  if (!player && !coach) return jsonError("Player or coach account required.", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const { contentType, sizeBytes } = body as { contentType?: unknown; sizeBytes?: unknown };

  if (typeof contentType !== "string" || !(contentType in ALLOWED_AVATAR_TYPES)) {
    return jsonError("Unsupported image type.", 400);
  }
  if (
    !Number.isInteger(sizeBytes) ||
    typeof sizeBytes !== "number" ||
    sizeBytes <= 0 ||
    sizeBytes > MAX_AVATAR_SIZE_BYTES
  ) {
    return jsonError("Invalid image size.", 400);
  }

  const storagePath = buildAvatarPath(user.id, contentType);

  let supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch {
    return jsonError("Upload service is not configured.", 500);
  }

  const { data, error } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true });

  if (error) return jsonError("Could not authorize upload.", 500);

  return Response.json({
    upload: {
      bucket: AVATAR_BUCKET,
      path: storagePath,
      token: data.token,
      signedUrl: data.signedUrl,
    },
  });
}

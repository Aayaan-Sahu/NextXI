"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/app/api/videos/utils";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function deleteVideo(formData: FormData) {
  const user = await requireUser();

  const id = formData.get("id");
  if (!isUuid(id)) return;

  const video = await prisma.playerVideo.findFirst({
    where: { id, playerId: user.id },
    select: { storageBucket: true, storagePath: true, thumbnailPath: true },
  });
  if (!video) return;

  // Row first (cascades the report, comments, and views), storage second:
  // an orphaned storage object is preferable to a video row whose file is gone.
  await prisma.playerVideo.deleteMany({ where: { id, playerId: user.id } });

  const paths = [video.storagePath, video.thumbnailPath].filter(
    (path): path is string => path !== null,
  );
  try {
    await createSupabaseAdminClient()
      .storage.from(video.storageBucket)
      .remove(paths);
  } catch {
    // Best effort — the video is already gone from the app.
  }

  revalidatePath("/dashboard/player");
}

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AVATAR_BUCKET } from "@/lib/avatars";

const AVATAR_URL_TTL_SECONDS = 60 * 60;

/** Signs a single avatar storage path, or returns null if unset/signing fails. */
export async function getAvatarUrl(avatarPath: string | null): Promise<string | null> {
  if (!avatarPath) return null;

  const { data, error } = await createSupabaseAdminClient()
    .storage.from(AVATAR_BUCKET)
    .createSignedUrl(avatarPath, AVATAR_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

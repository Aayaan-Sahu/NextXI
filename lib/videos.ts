/**
 * The video taxonomy now lives in shared/videos.ts so the mobile apps can
 * import it too; it is re-exported here because ~20 modules already import it
 * from this path. What stays is the one piece that cannot be shared.
 */
export * from "@/shared/videos";

export function getSupabaseTusEndpoint() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required.");
  }

  const url = new URL(supabaseUrl);
  const match = url.hostname.match(/^([^.]+)\.supabase\.co$/);

  if (url.protocol !== "https:" || !match) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a hosted Supabase project URL.");
  }

  return `https://${match[1]}.storage.supabase.co/storage/v1/upload/resumable/sign`;
}

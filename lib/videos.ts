export const VIDEO_BUCKET = "player-videos";
export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;
export const TUS_CHUNK_SIZE_BYTES = 6 * 1024 * 1024;
export const VIDEO_CACHE_CONTROL = "3600";

export const ALLOWED_VIDEO_TYPES = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
} as const;

export type AllowedVideoType = keyof typeof ALLOWED_VIDEO_TYPES;
export type VideoExtension = (typeof ALLOWED_VIDEO_TYPES)[AllowedVideoType];

export function formatVideoSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function getVideoExtension(contentType: string): VideoExtension | null {
  return contentType in ALLOWED_VIDEO_TYPES
    ? ALLOWED_VIDEO_TYPES[contentType as AllowedVideoType]
    : null;
}

export function buildPlayerVideoPath(playerId: string, videoId: string, contentType: string) {
  const extension = getVideoExtension(contentType);

  if (!extension) {
    throw new Error("Unsupported video content type.");
  }

  return `${playerId}/${videoId}/source.${extension}`;
}

export function buildPlayerVideoThumbnailPath(playerId: string, videoId: string) {
  return `${playerId}/${videoId}/thumb.jpg`;
}

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

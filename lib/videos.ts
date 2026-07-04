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

/** Keys match the Prisma VideoCategory enum names. */
export const VIDEO_DISCIPLINES = {
  PACE: {
    label: "Pace bowling",
    variations: ["Stock ball", "Yorker", "Bouncer", "Slower ball", "Leg cutter", "Off cutter"],
  },
  OFF_SPIN: {
    label: "Off spin",
    variations: ["Stock ball", "Arm ball", "Top spinner", "Carrom ball", "Doosra"],
  },
  LEG_SPIN: {
    label: "Leg spin",
    variations: ["Stock ball", "Googly", "Slider", "Top spinner", "Flipper"],
  },
  BATTING: {
    label: "Batting",
    variations: [
      "Straight drive",
      "Cover drive",
      "On drive",
      "Square drive",
      "Cut",
      "Pull",
      "Hook",
      "Sweep",
      "Reverse sweep",
      "Flick",
    ],
  },
} as const;

export type VideoDiscipline = keyof typeof VIDEO_DISCIPLINES;

/** Keys match the Prisma Handedness enum names. */
export const HANDEDNESS_LABELS = {
  RIGHT: "Right",
  LEFT: "Left",
} as const;

export type HandednessOption = keyof typeof HANDEDNESS_LABELS;

export function isVideoDiscipline(value: unknown): value is VideoDiscipline {
  return typeof value === "string" && value in VIDEO_DISCIPLINES;
}

export function isHandedness(value: unknown): value is HandednessOption {
  return typeof value === "string" && value in HANDEDNESS_LABELS;
}

export function isVariationOf(discipline: VideoDiscipline, value: unknown): value is string {
  return (
    typeof value === "string" &&
    (VIDEO_DISCIPLINES[discipline].variations as readonly string[]).includes(value)
  );
}

/** One-line tag summary for video cards, e.g. "Pace bowling · Yorker · Right". */
export function formatVideoTags(
  category: string | null,
  variation: string | null,
  handedness: string | null,
) {
  if (!isVideoDiscipline(category)) return "Untagged";

  return [
    VIDEO_DISCIPLINES[category].label,
    variation,
    isHandedness(handedness) ? `${HANDEDNESS_LABELS[handedness]} handed` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

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

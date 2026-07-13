export const AVATAR_BUCKET = "profile-avatars";
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
export const AVATAR_CACHE_CONTROL = "3600";

export const ALLOWED_AVATAR_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedAvatarType = keyof typeof ALLOWED_AVATAR_TYPES;

export function getAvatarExtension(contentType: string): string | null {
  return contentType in ALLOWED_AVATAR_TYPES
    ? ALLOWED_AVATAR_TYPES[contentType as AllowedAvatarType]
    : null;
}

/** One file per user — re-uploading overwrites the previous photo. */
export function buildAvatarPath(userId: string, contentType: string) {
  const extension = getAvatarExtension(contentType);

  if (!extension) {
    throw new Error("Unsupported image content type.");
  }

  return `${userId}/avatar.${extension}`;
}

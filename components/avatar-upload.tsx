"use client";

import { useRef, useState } from "react";
import { removeAvatar } from "@/app/dashboard/profile/actions";
import { ALLOWED_AVATAR_TYPES, MAX_AVATAR_SIZE_BYTES } from "@/lib/avatars";

type InitiateUploadResponse = {
  upload: {
    bucket: string;
    path: string;
    token: string;
    signedUrl: string;
  };
};

async function readError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "Upload failed.";
}

function validateFile(file: File) {
  if (!(file.type in ALLOWED_AVATAR_TYPES)) return "Choose a JPEG, PNG, or WebP image.";
  if (file.size <= 0 || file.size > MAX_AVATAR_SIZE_BYTES) {
    return "Images must be larger than 0 bytes and no more than 5 MB.";
  }
  return null;
}

/**
 * Profile photo picker for the edit-profile form. Uploads directly to
 * Supabase storage on file selection and tracks the resulting storage path
 * in a hidden `avatarPath` field, so the new photo is only persisted to the
 * Player/Coach row when the surrounding form is submitted.
 */
export function AvatarField({
  avatarPath: initialAvatarPath,
  avatarUrl,
  initial,
}: {
  avatarPath: string | null;
  avatarUrl: string | null;
  initial: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarPath, setAvatarPath] = useState(initialAvatarPath ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null | undefined) {
    if (!file || uploading) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const initiateResponse = await fetch("/api/profile/avatar/initiate-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }),
      });

      if (!initiateResponse.ok) {
        throw new Error(await readError(initiateResponse));
      }

      const initiated = (await initiateResponse.json()) as InitiateUploadResponse;

      const uploadResponse = await fetch(initiated.upload.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed.");
      }

      setAvatarPath(initiated.upload.path);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      setPreviewUrl(null);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (removing || uploading) return;

    setError(null);
    setRemoving(true);
    try {
      await removeAvatar();
      setAvatarPath("");
      setPreviewUrl(null);
      setCurrentAvatarUrl(null);
    } catch {
      setError("Could not remove photo.");
    } finally {
      setRemoving(false);
    }
  }

  const displayUrl = previewUrl ?? currentAvatarUrl;

  return (
    <div className="flex items-center gap-4">
      <input name="avatarPath" type="hidden" value={avatarPath} />
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold-500 text-lg font-bold text-pitch-900">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="Profile photo" className="size-full object-cover" src={displayUrl} />
        ) : (
          initial
        )}
      </div>
      <div>
        <input
          accept={Object.keys(ALLOWED_AVATAR_TYPES).join(",")}
          className="hidden"
          disabled={uploading}
          onChange={(event) => handleFile(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
        <div className="flex gap-2">
          <button
            className="cursor-pointer rounded-md border border-cream-500 bg-transparent px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-cream-100 disabled:cursor-default disabled:opacity-60"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          {displayUrl ? (
            <button
              className="cursor-pointer rounded-md border border-cream-500 bg-transparent px-4 py-2 text-sm font-semibold text-rust-600 hover:bg-cream-100 disabled:cursor-default disabled:opacity-60"
              disabled={removing}
              onClick={handleRemove}
              type="button"
            >
              {removing ? "Removing…" : "Remove photo"}
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-1.5 text-xs text-rust-700">{error}</p> : null}
      </div>
    </div>
  );
}

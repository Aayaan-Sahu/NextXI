"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";
import { RecordingGuideButton } from "@/components/recording-guide";
import { Field, PrimaryButton, Select } from "@/components/ui";
import {
  ALLOWED_VIDEO_TYPES,
  HANDEDNESS_LABELS,
  MAX_VIDEO_SIZE_BYTES,
  VIDEO_BUCKET,
  VIDEO_CACHE_CONTROL,
  VIDEO_DISCIPLINES,
  type HandednessOption,
  type VideoDiscipline,
} from "@/lib/videos";

type InitiateUploadResponse = {
  video: {
    id: string;
    status: "PENDING_UPLOAD";
    createdAt: string;
  };
  upload: {
    bucket: typeof VIDEO_BUCKET;
    path: string;
    token: string;
    signedUrl: string;
    tusEndpoint: string;
    chunkSize: number;
    cacheControl: typeof VIDEO_CACHE_CONTROL;
  };
  thumbnailUpload: { signedUrl: string } | null;
};

const acceptedTypes = Object.keys(ALLOWED_VIDEO_TYPES).join(",");
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function readError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "Upload failed.";
}

function validateFile(file: File) {
  if (!(file.type in ALLOWED_VIDEO_TYPES)) return "Choose an MP4, MOV, or WebM file.";
  if (file.size <= 0 || file.size > MAX_VIDEO_SIZE_BYTES) {
    return "Videos must be larger than 0 bytes and no more than 500 MB.";
  }
  return null;
}

const THUMBNAIL_MAX_WIDTH = 640;

/** Captures a frame from the video as a JPEG. Returns null if the browser cannot decode it. */
async function captureThumbnail(file: File): Promise<Blob | null> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = objectUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Could not decode video."));
    });

    const seekTo = Math.min(1, (video.duration || 0) / 2);
    if (video.currentTime !== seekTo) {
      video.currentTime = seekTo;
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("Could not seek video."));
      });
    }

    if (!video.videoWidth || !video.videoHeight) return null;

    const scale = Math.min(1, THUMBNAIL_MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    URL.revokeObjectURL(objectUrl);
  }
}

/** Best-effort: a failed thumbnail never fails the video upload. */
async function uploadThumbnail(thumbnail: Blob, signedUrl: string) {
  try {
    await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: thumbnail,
    });
  } catch {
    // Ignore: the video card falls back to a placeholder.
  }
}

export function VideoUpload({
  session,
}: {
  /** When set, the upload is filed into this session and its discipline is locked. */
  session?: { id: string; category: VideoDiscipline };
} = {}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [discipline, setDiscipline] = useState<VideoDiscipline | "">(session?.category ?? "");
  const [variation, setVariation] = useState("");
  const [handedness, setHandedness] = useState<HandednessOption | "">("");

  async function handleFile(file: File | null | undefined) {
    if (!file || uploading) return;

    if (!discipline || !variation || !handedness) {
      setError("Choose a discipline, variation, and handedness before uploading.");
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!supabasePublishableKey) {
      setError("Supabase publishable key is not configured.");
      return;
    }

    setError(null);
    setProgress(0);
    setUploading(true);

    try {
      // Also the playability gate: MP4/MOV/WebM containers can hold codecs
      // browsers cannot decode (e.g. MPEG-4 Part 2), and if this browser cannot
      // render a frame, coaches will not be able to play the video back either.
      const thumbnail = await captureThumbnail(file);
      if (!thumbnail) {
        throw new Error(
          "This video uses a codec browsers cannot play. Re-export it as an H.264 MP4 and try again.",
        );
      }

      const initiateResponse = await fetch("/api/videos/initiate-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalFilename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          category: discipline,
          variation,
          handedness,
          ...(session ? { sessionId: session.id } : {}),
        }),
      });

      if (!initiateResponse.ok) {
        throw new Error(await readError(initiateResponse));
      }

      const initiated = (await initiateResponse.json()) as InitiateUploadResponse;

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: initiated.upload.tusEndpoint,
          chunkSize: initiated.upload.chunkSize,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          removeFingerprintOnSuccess: true,
          uploadDataDuringCreation: true,
          headers: {
            apikey: supabasePublishableKey,
            "x-signature": initiated.upload.token,
          },
          metadata: {
            bucketName: initiated.upload.bucket,
            objectName: initiated.upload.path,
            contentType: file.type,
            cacheControl: initiated.upload.cacheControl,
          },
          onProgress(bytesUploaded, bytesTotal) {
            setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
          },
          onError(error) {
            reject(error);
          },
          onSuccess() {
            resolve();
          },
        });

        upload.start();
      });

      if (initiated.thumbnailUpload) {
        await uploadThumbnail(thumbnail, initiated.thumbnailUpload.signedUrl);
      }

      const completeResponse = await fetch("/api/videos/complete-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: initiated.video.id }),
      });

      if (!completeResponse.ok) {
        throw new Error(await readError(completeResponse));
      }

      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="rounded-[10px] border border-dashed border-cream-500 bg-white p-6">
      <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
        <Field>
          Discipline
          <Select
            disabled={uploading || Boolean(session)}
            onChange={(event) => {
              setDiscipline(event.target.value as VideoDiscipline | "");
              setVariation("");
            }}
            value={discipline}
          >
            <option value="">Select…</option>
            {Object.entries(VIDEO_DISCIPLINES).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          {discipline === "BATTING" ? "Shot" : "Variation"}
          <Select
            disabled={uploading || !discipline}
            onChange={(event) => setVariation(event.target.value)}
            value={variation}
          >
            <option value="">Select…</option>
            {discipline &&
              VIDEO_DISCIPLINES[discipline].variations.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
          </Select>
        </Field>
        <Field>
          Handedness
          <Select
            disabled={uploading}
            onChange={(event) => setHandedness(event.target.value as HandednessOption | "")}
            value={handedness}
          >
            <option value="">Select…</option>
            {Object.entries(HANDEDNESS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <section
        className={`relative mt-4 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-[38px] text-center ${
          dragActive ? "border-gold-500 bg-cream-50" : "border-cream-500"
        }`}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFile(event.dataTransfer.files[0]);
        }}
      >
        <RecordingGuideButton />
        <input
          accept={acceptedTypes}
          className="hidden"
          disabled={uploading}
          onChange={(event) => handleFile(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />

        {uploading ? (
          <div className="grid w-full max-w-[420px] gap-2">
            <div className="h-1.5 overflow-hidden rounded-sm bg-cream-300">
              <div
                className="h-full bg-gold-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="font-mono text-xs text-ink-600">{progress}% uploaded</p>
          </div>
        ) : (
          <>
            <p className="font-display text-[19px] font-semibold tracking-[.03em] uppercase">
              Drag and drop a video to upload
            </p>
            <p className="text-[13px] text-ink-600">
              MP4, MOV, or WebM, up to 500 MB.
            </p>
            <div className="mt-2.5">
              <PrimaryButton onClick={() => inputRef.current?.click()} type="button">
                Browse files
              </PrimaryButton>
            </div>
          </>
        )}

        {error ? <p className="text-sm text-rust-700">{error}</p> : null}
      </section>
    </section>
  );
}

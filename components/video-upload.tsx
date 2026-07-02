"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as tus from "tus-js-client";
import {
  ALLOWED_VIDEO_TYPES,
  MAX_VIDEO_SIZE_BYTES,
  VIDEO_BUCKET,
  VIDEO_CACHE_CONTROL,
} from "@/lib/videos";

type ReadyVideo = {
  id: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  status: "READY";
  uploadedAt: string | null;
  createdAt: string;
};

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
};

const acceptedTypes = Object.keys(ALLOWED_VIDEO_TYPES).join(",");
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function readError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "Upload failed.";
}

export function VideoUpload({ initialVideos }: { initialVideos: ReadyVideo[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [videos, setVideos] = useState<ReadyVideo[]>(initialVideos);

  const selectedFileError = useMemo(() => {
    if (!file) return null;
    if (!(file.type in ALLOWED_VIDEO_TYPES)) return "Choose an MP4, MOV, or WebM file.";
    if (file.size <= 0 || file.size > MAX_VIDEO_SIZE_BYTES) {
      return "Videos must be larger than 0 bytes and no more than 500 MB.";
    }
    return null;
  }, [file]);

  async function loadVideos() {
    const response = await fetch("/api/videos", { cache: "no-store" });
    if (!response.ok) return;

    const body = (await response.json()) as { videos: ReadyVideo[] };
    setVideos(body.videos);
  }

  async function uploadFile() {
    if (!file || selectedFileError) {
      setError(selectedFileError ?? "Choose a video first.");
      return;
    }
    if (!supabasePublishableKey) {
      setError("Supabase publishable key is not configured.");
      return;
    }

    setError(null);
    setMessage(null);
    setProgress(0);
    setUploading(true);

    try {
      const initiateResponse = await fetch("/api/videos/initiate-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalFilename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
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

      const completeResponse = await fetch("/api/videos/complete-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: initiated.video.id }),
      });

      if (!completeResponse.ok) {
        throw new Error(await readError(completeResponse));
      }

      setFile(null);
      setProgress(100);
      setMessage("Video uploaded.");
      await loadVideos();
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="mb-4 text-lg font-semibold leading-tight">Videos</h2>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium">
          Upload source video
          <input
            accept={acceptedTypes}
            className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-neutral-950 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-stone-300 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-neutral-950 focus:border-neutral-950 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:file:border-neutral-700 dark:file:bg-neutral-900 dark:file:text-neutral-50 dark:focus:border-neutral-50 dark:focus:ring-neutral-600"
            disabled={uploading}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
              setMessage(null);
              setProgress(0);
            }}
            type="file"
          />
        </label>

        {file ? (
          <p className="text-sm text-stone-600 dark:text-neutral-300">
            {file.name} · {formatSize(file.size)}
          </p>
        ) : null}
        {selectedFileError ? <p className="text-sm text-red-700 dark:text-red-300">{selectedFileError}</p> : null}
        {error ? <p className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
        {message ? <p className="text-sm text-stone-600 dark:text-neutral-300">{message}</p> : null}

        {uploading ? (
          <div className="grid gap-2">
            <div className="h-2 overflow-hidden rounded-sm bg-stone-200 dark:bg-neutral-800">
              <div
                className="h-full bg-neutral-950 dark:bg-neutral-50"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-stone-600 dark:text-neutral-300">{progress}% uploaded</p>
          </div>
        ) : null}

        <button
          className="w-fit cursor-pointer rounded-md border border-neutral-950 bg-neutral-950 px-3.5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-50 dark:bg-neutral-50 dark:text-neutral-950"
          disabled={!file || Boolean(selectedFileError) || uploading}
          onClick={uploadFile}
          type="button"
        >
          {uploading ? "Uploading" : "Upload video"}
        </button>

        <div className="grid gap-2 border-t border-stone-300 pt-4 dark:border-neutral-700">
          <h3 className="text-sm font-semibold">Uploaded videos</h3>
          {videos.length ? (
            <ul className="grid gap-2">
              {videos.map((video) => (
                <li
                  className="flex items-center justify-between gap-3 border-t border-stone-300 pt-2 text-sm dark:border-neutral-700"
                  key={video.id}
                >
                  <span className="min-w-0 truncate">{video.originalFilename}</span>
                  <span className="shrink-0 text-stone-600 dark:text-neutral-300">
                    {formatSize(video.sizeBytes)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-600 dark:text-neutral-300">No videos uploaded.</p>
          )}
        </div>
      </div>
    </section>
  );
}

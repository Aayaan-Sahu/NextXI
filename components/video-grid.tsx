import Link from "next/link";
import { formatVideoSize } from "@/lib/videos";

type GridVideo = {
  id: string;
  originalFilename: string;
  sizeBytes: number;
  thumbnailUrl: string | null;
  uploadedAt: Date | null;
  createdAt: Date;
  playerName?: string;
  tagLabel?: string;
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function TrashIcon() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 5v6m4-6v6" />
    </svg>
  );
}

export function VideoGrid({
  videos,
  linkBase = "/dashboard/player/videos",
  emptyMessage = "No videos yet. Upload your first video above.",
  deleteAction,
}: {
  videos: GridVideo[];
  linkBase?: string;
  emptyMessage?: string;
  /** When provided, each card gets a trash button that submits the video id. */
  deleteAction?: (formData: FormData) => Promise<void>;
}) {
  if (!videos.length) {
    return <p className="text-sm text-stone-600">{emptyMessage}</p>;
  }

  return (
    <ul className="grid grid-cols-3 gap-4 max-md:grid-cols-2 max-sm:grid-cols-1">
      {videos.map((video) => (
        <li className="relative" key={video.id}>
          <Link
            className="block overflow-hidden rounded-lg border border-stone-300 bg-white no-underline hover:border-neutral-950"
            href={`${linkBase}/${video.id}`}
          >
            {video.thumbnailUrl ? (
              // Signed, short-lived storage URL; next/image would need remote host config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="aspect-video w-full bg-stone-100 object-cover"
                src={video.thumbnailUrl}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-stone-100 text-2xl text-stone-600">
                ▶
              </div>
            )}
            <div className="grid gap-1 p-3">
              <span className="truncate text-sm font-medium text-neutral-950">
                {video.originalFilename}
              </span>
              <span className="text-xs text-stone-600">
                {formatDate(video.uploadedAt ?? video.createdAt)} · {formatVideoSize(video.sizeBytes)}
              </span>
              {video.tagLabel && (
                <span className="truncate text-xs text-stone-600">{video.tagLabel}</span>
              )}
              {video.playerName && (
                <span className="truncate text-xs text-stone-600">{video.playerName}</span>
              )}
            </div>
          </Link>
          {deleteAction && (
            <form action={deleteAction} className="absolute bottom-2 right-2">
              <input name="id" type="hidden" value={video.id} />
              <button
                aria-label={`Delete ${video.originalFilename}`}
                className="rounded p-1.5 text-stone-500 hover:bg-stone-100 hover:text-red-600"
                type="submit"
              >
                <TrashIcon />
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}

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
  deleteLabel = "Delete",
}: {
  videos: GridVideo[];
  linkBase?: string;
  emptyMessage?: string;
  /** When provided, each card gets a trash button that submits the video id. */
  deleteAction?: (formData: FormData) => Promise<void>;
  /** Accessible verb for the action button, e.g. "Remove from session". */
  deleteLabel?: string;
}) {
  if (!videos.length) {
    return <p className="text-sm text-ink-600">{emptyMessage}</p>;
  }

  return (
    <ul className="grid grid-cols-3 gap-5 max-md:grid-cols-2 max-sm:grid-cols-1">
      {videos.map((video) => (
        <li className="relative" key={video.id}>
          <Link
            className="block overflow-hidden rounded-[10px] border border-cream-400 bg-white no-underline hover:border-gold-500"
            href={`${linkBase}/${video.id}`}
          >
            {video.thumbnailUrl ? (
              // Signed, short-lived storage URL; next/image would need remote host config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="aspect-video w-full bg-pitch-800 object-cover"
                src={video.thumbnailUrl}
              />
            ) : (
              <div className="grid aspect-video place-items-center bg-thumb-scanlines text-[26px] text-gold-500">
                ▶
              </div>
            )}
            <div className="px-4 pt-3.5 pb-3">
              <div className="truncate text-sm font-semibold text-ink-900">
                {video.originalFilename}
              </div>
              <div className="mt-1 font-mono text-[11.5px] text-ink-600">
                {formatDate(video.uploadedAt ?? video.createdAt)} · {formatVideoSize(video.sizeBytes)}
              </div>
              {video.tagLabel && (
                <div
                  className={`mt-2 truncate text-xs font-semibold text-rust-600 ${
                    deleteAction ? "pr-7" : ""
                  }`}
                >
                  {video.tagLabel}
                </div>
              )}
              {video.playerName && (
                <div className="mt-1 truncate text-xs text-ink-600">{video.playerName}</div>
              )}
            </div>
          </Link>
          {deleteAction && (
            <form action={deleteAction} className="absolute right-2.5 bottom-2.5">
              <input name="id" type="hidden" value={video.id} />
              <button
                aria-label={`${deleteLabel} ${video.originalFilename}`}
                className="cursor-pointer rounded p-1 text-sage-400 hover:bg-cream-200 hover:text-rust-600"
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

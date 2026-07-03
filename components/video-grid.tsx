import Link from "next/link";
import { formatVideoSize } from "@/lib/videos";

type GridVideo = {
  id: string;
  originalFilename: string;
  sizeBytes: number;
  thumbnailUrl: string | null;
  uploadedAt: Date | null;
  createdAt: Date;
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function VideoGrid({ videos }: { videos: GridVideo[] }) {
  if (!videos.length) {
    return (
      <p className="text-sm text-stone-600 dark:text-neutral-300">
        No videos yet. Upload your first video above.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-4 max-md:grid-cols-2 max-sm:grid-cols-1">
      {videos.map((video) => (
        <li key={video.id}>
          <Link
            className="block overflow-hidden rounded-lg border border-stone-300 bg-white no-underline hover:border-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-50"
            href={`/dashboard/player/videos/${video.id}`}
          >
            {video.thumbnailUrl ? (
              // Signed, short-lived storage URL; next/image would need remote host config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="aspect-video w-full bg-stone-100 object-cover dark:bg-neutral-800"
                src={video.thumbnailUrl}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-stone-100 text-2xl text-stone-600 dark:bg-neutral-800 dark:text-neutral-300">
                ▶
              </div>
            )}
            <div className="grid gap-1 p-3">
              <span className="truncate text-sm font-medium text-neutral-950 dark:text-neutral-50">
                {video.originalFilename}
              </span>
              <span className="text-xs text-stone-600 dark:text-neutral-300">
                {formatDate(video.uploadedAt ?? video.createdAt)} · {formatVideoSize(video.sizeBytes)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

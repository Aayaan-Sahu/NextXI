import Link from "next/link";
import type { ReportStatus } from "@/app/generated/prisma/enums";
import { EmptyState } from "@/components/ui";
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
  /** When set, the card carries a coaching-report status chip. */
  reportStatus?: ReportStatus | null;
  commentCount?: number;
};

/** Report chip per status — mono, square-cornered, per the Lower-Third Rule. */
function ReportChip({ status }: { status: ReportStatus }) {
  const chipStyles =
    "pointer-events-none absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-[3px] px-2 py-1 font-mono text-[10px] font-semibold tracking-[.14em] uppercase";

  if (status === "READY") {
    return <span className={`${chipStyles} bg-gold-500 text-pitch-900`}>Report ready</span>;
  }
  if (status === "FAILED") {
    return <span className={`${chipStyles} bg-rust-600 text-cream-50`}>Analysis failed</span>;
  }
  return (
    <span className={`${chipStyles} bg-pitch-950/85 text-cream-200`}>
      <span aria-hidden className="size-1.5 rounded-full bg-gold-500 motion-safe:animate-pulse" />
      Analysing
    </span>
  );
}

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
  emptyMessage = "No videos yet. Upload your first clip in Footage above.",
  emptyMedia = false,
  deleteAction,
  deleteLabel = "Delete",
  stagger = true,
}: {
  videos: GridVideo[];
  linkBase?: string;
  emptyMessage?: string;
  /** Opt into the scanline play thumb — for library empties, not coach queues. */
  emptyMedia?: boolean;
  /** When provided, each card gets a trash button that submits the video id. */
  deleteAction?: (formData: FormData) => Promise<void>;
  /** Accessible verb for the action button, e.g. "Remove from session". */
  deleteLabel?: string;
  /** Off when a reveal wrapper already animates the section, to avoid doubling. */
  stagger?: boolean;
}) {
  if (!videos.length) {
    return <EmptyState media={emptyMedia}>{emptyMessage}</EmptyState>;
  }

  return (
    <ul className="grid grid-cols-3 gap-5 max-md:grid-cols-2 max-sm:grid-cols-1">
      {videos.map((video, index) => (
        <li
          className={stagger ? "relative animate-crease-rise" : "relative"}
          key={video.id}
          style={stagger ? { animationDelay: `${Math.min(index, 8) * 50}ms` } : undefined}
        >
          <Link
            className="group block overflow-hidden rounded-[10px] border border-cream-400 bg-white no-underline hover:border-gold-500"
            href={`${linkBase}/${video.id}`}
          >
            <div className="relative overflow-hidden">
              {video.thumbnailUrl ? (
                <>
                  {/* Signed, short-lived storage URL; next/image would need remote host config. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    className="aspect-video w-full bg-pitch-800 object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
                    src={video.thumbnailUrl}
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 grid place-items-center bg-pitch-950/35 text-[26px] text-cream-200 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  >
                    ▶
                  </div>
                </>
              ) : (
                <div className="grid aspect-video place-items-center bg-thumb-scanlines text-[26px] text-gold-500">
                  ▶
                </div>
              )}
              {video.reportStatus ? <ReportChip status={video.reportStatus} /> : null}
            </div>
            <div className="px-4 pt-3.5 pb-3">
              <div className="truncate text-sm font-semibold text-ink-900">
                {video.originalFilename}
              </div>
              <div className="mt-1 font-mono text-[11.5px] text-ink-600">
                {formatDate(video.uploadedAt ?? video.createdAt)} · {formatVideoSize(video.sizeBytes)}
                {video.commentCount ? ` · ${video.commentCount} note${video.commentCount === 1 ? "" : "s"}` : null}
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
                className="grid size-8 cursor-pointer place-items-center rounded-md border border-cream-400 bg-white text-ink-600 hover:border-rust-600 hover:text-rust-700"
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

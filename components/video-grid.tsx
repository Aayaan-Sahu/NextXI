import Link from "next/link";
import type { ReportStatus } from "@/app/generated/prisma/enums";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
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

/** Report chip per status — a card overlay, top-left. */
export function ReportChip({ status }: { status: ReportStatus }) {
  const chipStyles =
    "pointer-events-none absolute top-2 left-2 inline-flex items-center gap-1.5 rounded px-[7px] py-[3px] text-micro font-semibold";

  if (status === "READY") {
    return <span className={`${chipStyles} bg-pitch-900/[.82] text-amber-500`}>Report ready</span>;
  }
  if (status === "FAILED") {
    return <span className={`${chipStyles} bg-rust-600 text-cream-50`}>Analysis failed</span>;
  }
  return (
    <span className={`${chipStyles} bg-pitch-900/60 text-cream-200`}>
      <span aria-hidden className="size-1.5 rounded-full bg-cream-200 motion-safe:animate-pulse" />
      Analysing
    </span>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function VideoGrid({
  className = "grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1",
  videos,
  linkBase = "/dashboard/player/videos",
  emptyMessage = "No videos yet. Drop a clip in the box above to get your first coaching report.",
  deleteAction,
  deleteConfirmDescription = "This clip and its coaching report are removed for good.",
  deleteConfirmTitle = "Delete this video?",
  deleteLabel = "Delete",
  stagger = true,
}: {
  /** Column count for this surface — the coach queue runs four up. */
  className?: string;
  videos: GridVideo[];
  linkBase?: string;
  emptyMessage?: string;
  /** When provided, each card gets a trash button that submits the video id. */
  deleteAction?: (formData: FormData) => Promise<void>;
  deleteConfirmDescription?: string;
  deleteConfirmTitle?: string;
  /** Accessible verb for the action button, e.g. "Remove from session". */
  deleteLabel?: string;
  /** Off when a reveal wrapper already animates the section, to avoid doubling. */
  stagger?: boolean;
}) {
  if (!videos.length) {
    return <EmptyState>{emptyMessage}</EmptyState>;
  }

  return (
    <ul className={`grid gap-5 ${className}`}>
      {videos.map((video, index) => {
        // A coach sees whose clip it is first, then the machine facts; a
        // player already knows, so their card carries one quiet line.
        const attribution = video.playerName
          ? [video.playerName, video.tagLabel].filter(Boolean).join(" · ")
          : null;
        const facts = [
          formatDate(video.uploadedAt ?? video.createdAt),
          ...(attribution ? [formatVideoSize(video.sizeBytes)] : []),
          ...(attribution ? [] : video.tagLabel ? [video.tagLabel] : []),
          ...(video.commentCount
            ? [`${video.commentCount} note${video.commentCount === 1 ? "" : "s"}`]
            : attribution
              ? ["no notes"]
              : []),
        ].join(" · ");

        return (
          <li
            className={`group/card relative ${stagger ? "animate-crease-rise" : ""}`}
            key={video.id}
            style={stagger ? { animationDelay: `${Math.min(index, 8) * 50}ms` } : undefined}
          >
            <Link className="group/thumb block no-underline" href={`${linkBase}/${video.id}`}>
              <div className="relative overflow-hidden rounded-md">
                {video.thumbnailUrl ? (
                  <>
                    {/* Signed, short-lived storage URL; next/image would need remote host config. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt=""
                      className="aspect-video w-full bg-olive-800 object-cover transition-transform duration-300 motion-safe:group-hover/thumb:scale-[1.03]"
                      src={video.thumbnailUrl}
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 grid place-items-center bg-olive-950/35 text-figure text-cream-200 opacity-0 transition-opacity duration-200 group-hover/thumb:opacity-100"
                    >
                      ▶
                    </div>
                  </>
                ) : (
                  <div className="grid aspect-video place-items-center bg-clip-scanlines text-figure text-cream-200/70">
                    ▶
                  </div>
                )}
                {video.reportStatus ? <ReportChip status={video.reportStatus} /> : null}
              </div>
              <div className="mt-2 truncate text-ui font-semibold text-ink-900">
                {video.originalFilename}
              </div>
              {attribution ? (
                <div className="mt-0.5 truncate text-caption text-ink-600">{attribution}</div>
              ) : null}
              <div className="mt-0.5 truncate text-caption text-ink-600">{facts}</div>
            </Link>
            {/* The action reveals on hover or keyboard focus: the resting grid
                is footage, not a row of buttons. */}
            {deleteAction && (
              <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover/card:opacity-100 focus-within:opacity-100">
                <ConfirmDeleteButton
                  action={deleteAction}
                  description={deleteConfirmDescription}
                  id={video.id}
                  label={deleteLabel}
                  name={video.originalFilename}
                  title={deleteConfirmTitle}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

import Link from "next/link";
import { EmptyState, TextLink } from "@/components/ui";
import { relativeTime } from "@/lib/format-time";
import type { ApprovalQueueItem } from "@/lib/report-review";

/**
 * The coach's "Awaiting your approval" list — a compact row per report, not
 * the four-up grid: these rows are actions with a reason to carry (a hold),
 * which an overlay chip on a thumbnail cannot.
 */
export function ApprovalQueue({ items }: { items: ApprovalQueueItem[] }) {
  if (!items.length) {
    return (
      <EmptyState>
        Nothing waiting on you. New reports land here before your players see them.
      </EmptyState>
    );
  }

  return (
    <ul className="border-b border-cream-400">
      {items.map((item) => {
        const href = `/dashboard/coach/videos/${item.id}`;
        const facts = [
          item.playerName,
          item.playerAge !== null ? `aged ${item.playerAge}` : null,
          item.tagLabel,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <li className="flex items-start gap-4 border-t border-cream-400 py-4" key={item.id}>
            <Link className="block w-28 shrink-0 overflow-hidden rounded-md no-underline" href={href}>
              {item.thumbnailUrl ? (
                // Signed, short-lived storage URL; next/image would need remote host config.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="aspect-video w-full bg-olive-800 object-cover"
                  src={item.thumbnailUrl}
                />
              ) : (
                <div className="grid aspect-video place-items-center bg-clip-scanlines text-ui text-cream-200/70">
                  ▶
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                className="line-clamp-1 block text-ui font-semibold text-ink-900 no-underline hover:text-rust-700"
                href={href}
              >
                {item.originalFilename}
              </Link>
              <p className="mt-0.5 text-caption text-ink-600">{facts}</p>
              <p className="mt-0.5 text-caption text-ink-600">
                Report ready {relativeTime(item.reportReadyAt)}
                {item.reviewStatus === "HELD" ? (
                  <>
                    {" · "}
                    <span className="font-semibold text-rust-600">On hold</span>
                    {item.heldBy ? ` by ${item.heldBy}` : ""}
                  </>
                ) : null}
              </p>
              {item.holdReason ? (
                <p className="mt-1 line-clamp-2 text-caption text-ink-800">{item.holdReason}</p>
              ) : null}
            </div>
            <TextLink className="shrink-0" href={href}>
              Review →
            </TextLink>
          </li>
        );
      })}
    </ul>
  );
}

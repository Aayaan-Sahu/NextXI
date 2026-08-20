import Link from "next/link";
import { EmptyState, SectionHeading } from "@/components/ui";

export type CoachFeedbackItem = {
  id: string;
  authorName: string;
  authorUsername: string;
  body: string;
  createdAt: Date;
  videoId: string;
  videoFilename: string;
};

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

function relativeTime(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  for (const [unit, size] of RELATIVE_UNITS) {
    if (seconds >= size) {
      return new Intl.RelativeTimeFormat("en").format(-Math.floor(seconds / size), unit);
    }
  }
  return "just now";
}

/** The player home's digest of the latest coach comments on their videos. */
export function CoachFeedback({ items }: { items: CoachFeedbackItem[] }) {
  return (
    <section>
      <SectionHeading>Coach feedback</SectionHeading>
      {items.length ? (
        <ul className="mt-4">
          {items.map((item) => (
            <li
              className="border-t border-cream-400 py-4 first:border-t-0 first:pt-0 last:pb-0"
              key={item.id}
            >
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-ui font-semibold text-ink-900">{item.authorName}</span>
                <span className="text-caption text-ink-600">{relativeTime(item.createdAt)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-ui leading-relaxed text-ink-800">
                {item.body}
              </p>
              <Link
                className="mt-1.5 inline-block text-caption font-semibold text-rust-600 no-underline hover:text-rust-700"
                href={`/dashboard/player/videos/${item.videoId}`}
              >
                {item.videoFilename} →
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState>No coach feedback yet. Connect a coach to start.</EmptyState>
        </div>
      )}
    </section>
  );
}

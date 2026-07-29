import Link from "next/link";
import { Kicker, Panel } from "@/components/ui";

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

/** The player dashboard's digest of the latest coach comments on their videos. */
export function CoachFeedback({ items }: { items: CoachFeedbackItem[] }) {
  return (
    <Panel>
      <Kicker>Recent coach feedback</Kicker>
      {items.length ? (
        <ul className="mt-4 grid gap-[18px]">
          {items.map((item) => (
            <li
              className="border-t border-cream-400 pt-[18px] first:border-t-0 first:pt-0"
              key={item.id}
            >
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-bold text-ink-900">{item.authorName}</span>
                <span className="font-mono text-xs text-ink-600">
                  @{item.authorUsername}
                </span>
                <span className="font-mono text-xs text-sage-400">
                  {relativeTime(item.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm leading-[1.65] text-ink-900">
                {item.body}
              </p>
              <Link
                className="mt-1.5 inline-block text-[13px] font-semibold text-rust-600 hover:text-rust-700"
                href={`/dashboard/player/videos/${item.videoId}`}
              >
                {item.videoFilename} →
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-600">
          No coach feedback yet. Comments from connected coaches show up here.
        </p>
      )}
    </Panel>
  );
}

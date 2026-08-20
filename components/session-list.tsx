import Link from "next/link";
import type { VideoCategory } from "@/app/generated/prisma/enums";
import { EmptyState } from "@/components/ui";
import { VIDEO_DISCIPLINES } from "@/lib/videos";

type SessionCard = {
  id: string;
  name: string;
  category: VideoCategory;
  createdAt: Date;
  videoCount: number;
  coverUrl: string | null;
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Sessions as list rows, not a card grid — a session is a filing decision, and
 * a row reads its date, size and discipline in one line.
 */
export function SessionList({
  sessions,
  linkBase = "/dashboard/player/sessions",
}: {
  sessions: SessionCard[];
  linkBase?: string;
}) {
  if (!sessions.length) {
    return (
      <EmptyState>
        No sessions yet. Create one to group videos and track consistency across a practice.
      </EmptyState>
    );
  }

  return (
    <ul className="border-b border-cream-400">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            className="flex items-center gap-5 border-t border-cream-400 py-4 no-underline"
            href={`${linkBase}/${session.id}`}
          >
            {session.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-[60px] w-[104px] shrink-0 rounded-md bg-olive-800 object-cover"
                src={session.coverUrl}
              />
            ) : (
              <div className="h-[60px] w-[104px] shrink-0 rounded-md bg-clip-scanlines" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-body font-semibold text-ink-900">{session.name}</div>
              <div className="mt-[3px] text-caption text-ink-600">
                {formatDate(session.createdAt)} · {session.videoCount}{" "}
                {session.videoCount === 1 ? "clip" : "clips"} ·{" "}
                {VIDEO_DISCIPLINES[session.category].label}
              </div>
            </div>
            <span className="shrink-0 text-ui font-semibold text-rust-600">Open →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

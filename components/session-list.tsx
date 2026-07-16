import Link from "next/link";
import type { VideoCategory } from "@/app/generated/prisma/enums";
import { Badge } from "@/components/ui";
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

export function SessionList({
  sessions,
  linkBase = "/dashboard/player/sessions",
}: {
  sessions: SessionCard[];
  linkBase?: string;
}) {
  if (!sessions.length) {
    return (
      <p className="text-sm text-ink-600">
        No sessions yet. Create one to group videos and track consistency across a practice.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-5 max-md:grid-cols-2 max-sm:grid-cols-1">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            className="block overflow-hidden rounded-[10px] border border-cream-400 bg-white no-underline hover:border-gold-500"
            href={`${linkBase}/${session.id}`}
          >
            {session.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="aspect-video w-full bg-pitch-800 object-cover"
                src={session.coverUrl}
              />
            ) : (
              <div className="grid aspect-video place-items-center bg-thumb-scanlines text-[26px] text-gold-500">
                ▦
              </div>
            )}
            <div className="px-4 pt-3.5 pb-3">
              <div className="truncate text-sm font-semibold text-ink-900">{session.name}</div>
              <div className="mt-1 font-mono text-[11.5px] text-ink-600">
                {formatDate(session.createdAt)} · {session.videoCount}{" "}
                {session.videoCount === 1 ? "video" : "videos"}
              </div>
              <div className="mt-2">
                <Badge>{VIDEO_DISCIPLINES[session.category].label}</Badge>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

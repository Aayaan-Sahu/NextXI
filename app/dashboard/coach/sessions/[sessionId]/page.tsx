import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CoachStatus } from "@/app/generated/prisma/enums";
import { isUuid } from "@/app/api/videos/utils";
import { SessionConsistencyPanel } from "@/components/session-consistency-panel";
import { Badge, PageShell } from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { getProfile, requireUser } from "@/lib/auth";
import { hasAcceptedConnection } from "@/lib/connections";
import { computeSessionConsistency, MIN_VIDEOS_FOR_SESSION_STATS } from "@/lib/session-consistency";
import { getSessionWithVideos } from "@/lib/sessions.server";
import { VIDEO_DISCIPLINES } from "@/lib/videos";

export default async function CoachSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "coach") redirect(`/dashboard/${profile.role}`);
  if (profile.coach.status !== CoachStatus.APPROVED) redirect("/dashboard/coach");

  const { sessionId } = await params;
  if (!isUuid(sessionId)) notFound();

  const session = await getSessionWithVideos(sessionId);
  if (!session || !(await hasAcceptedConnection(user.id, session.playerId))) notFound();

  const consistency = computeSessionConsistency(session.category, session.readyPayloads);

  return (
    <PageShell>
      <Link
        className="inline-block text-[13px] font-semibold text-rust-600 hover:text-rust-700"
        href={`/dashboard/coach/players/${session.playerId}`}
      >
        ← {session.playerName}
      </Link>

      <header className="mt-[18px] mb-[22px]">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-[28px] leading-[1.05] font-bold tracking-[.02em] uppercase">
            {session.name}
          </h1>
          <Badge>{VIDEO_DISCIPLINES[session.category].label}</Badge>
        </div>
        <p className="mt-1.5 font-mono text-xs text-ink-600">
          {session.playerName} · {session.videos.length}{" "}
          {session.videos.length === 1 ? "video" : "videos"}
        </p>
      </header>

      <div className="grid grid-cols-[1.55fr_1fr] items-start gap-7 max-lg:grid-cols-1">
        <VideoGrid
          emptyMessage="No videos in this session yet."
          linkBase="/dashboard/coach/videos"
          videos={session.videos}
        />
        <SessionConsistencyPanel
          items={consistency}
          minVideos={MIN_VIDEOS_FOR_SESSION_STATS}
          readyCount={session.readyPayloads.length}
        />
      </div>
    </PageShell>
  );
}

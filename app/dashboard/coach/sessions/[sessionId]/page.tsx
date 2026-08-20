import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CoachStatus } from "@/app/generated/prisma/enums";
import { isUuid } from "@/app/api/videos/utils";
import { SessionConsistencyPanel } from "@/components/session-consistency-panel";
import { Chip, PageShell, SectionHeading, PageTitle } from "@/components/ui";
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
        className="inline-block text-ui font-semibold text-rust-600 no-underline hover:text-rust-700"
        href={`/dashboard/coach/players/${session.playerId}`}
      >
        ← {session.playerName}
      </Link>

      <header className="mt-3.5 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <PageTitle>{session.name}</PageTitle>
          <Chip>{VIDEO_DISCIPLINES[session.category].label}</Chip>
        </div>
        <p className="mt-1.5 text-ui text-ink-600">
          {session.playerName} · {session.videos.length}{" "}
          {session.videos.length === 1 ? "video" : "videos"} · {session.readyPayloads.length}{" "}
          report{session.readyPayloads.length === 1 ? "" : "s"} ready
        </p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <SectionHeading>Videos in this session</SectionHeading>
          <div className="mt-4">
            <VideoGrid
              emptyMessage="No videos in this session yet."
              linkBase="/dashboard/coach/videos"
              videos={session.videos}
            />
          </div>
        </div>
        <SessionConsistencyPanel
          items={consistency}
          minVideos={MIN_VIDEOS_FOR_SESSION_STATS}
          readyCount={session.readyPayloads.length}
        />
      </div>
    </PageShell>
  );
}

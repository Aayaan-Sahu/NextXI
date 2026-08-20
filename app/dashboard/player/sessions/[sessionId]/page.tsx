import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlayerStatus } from "@/app/generated/prisma/enums";
import { isUuid } from "@/app/api/videos/utils";
import {
  deleteSession,
  removeVideoFromSession,
  renameSession,
} from "@/app/dashboard/player/sessions/actions";
import { SessionConsistencyPanel } from "@/components/session-consistency-panel";
import { SessionVideoPicker } from "@/components/session-video-picker";
import { Chip, PageShell, SecondaryButton, SectionHeading } from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { VideoUpload } from "@/components/video-upload";
import { getProfile, requireUser } from "@/lib/auth";
import { computeSessionConsistency, MIN_VIDEOS_FOR_SESSION_STATS } from "@/lib/session-consistency";
import { getAssignableVideos, getSessionWithVideos } from "@/lib/sessions.server";
import { VIDEO_DISCIPLINES } from "@/lib/videos";

export default async function PlayerSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "player") redirect(`/dashboard/${profile.role}`);
  if (profile.player.status === PlayerStatus.PENDING_GUARDIAN) redirect("/dashboard/player");

  const { sessionId } = await params;
  if (!isUuid(sessionId)) notFound();

  const session = await getSessionWithVideos(sessionId, user.id);
  if (!session) notFound();

  const assignable = await getAssignableVideos(user.id, session.category);
  const consistency = computeSessionConsistency(session.category, session.readyPayloads);
  const createdAt = session.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <PageShell>
      <Link
        className="inline-block text-ui font-semibold text-rust-600 no-underline hover:text-rust-700"
        href="/dashboard/player/sessions"
      >
        ← All sessions
      </Link>

      <header className="mt-3.5 mb-6 flex items-start justify-between gap-6 max-md:flex-col">
        <div className="min-w-0 flex-1">
          <form action={renameSession} className="flex flex-wrap items-center gap-3">
            <input name="id" type="hidden" value={session.id} />
            <label className="sr-only" htmlFor="session-name">
              Session name
            </label>
            <input
              className="w-[320px] max-w-full rounded-md border border-cream-400 bg-cream-50 px-2.5 py-0.5 font-display text-display font-bold tracking-[.02em] text-ink-900 uppercase focus:border-ink-900 focus:ring-2 focus:ring-amber-500/30 focus:outline-none"
              defaultValue={session.name}
              id="session-name"
              maxLength={120}
              name="name"
              required
            />
            <SecondaryButton className="!px-3.5 !py-[7px] !text-caption" type="submit">
              Save name
            </SecondaryButton>
            <Chip>{VIDEO_DISCIPLINES[session.category].label}</Chip>
          </form>
          <p className="mt-2 text-ui text-ink-600">
            Created {createdAt} · {session.videos.length}{" "}
            {session.videos.length === 1 ? "video" : "videos"} ·{" "}
            {session.readyPayloads.length} report
            {session.readyPayloads.length === 1 ? "" : "s"} ready
          </p>
        </div>
        <form action={deleteSession}>
          <input name="id" type="hidden" value={session.id} />
          <button
            className="cursor-pointer text-ui font-semibold text-rust-600 hover:text-rust-700"
            type="submit"
          >
            Delete session
          </button>
        </form>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-4">
          <VideoUpload session={{ id: session.id, category: session.category }} />
          <SessionVideoPicker
            category={session.category}
            sessionId={session.id}
            videos={assignable}
          />
          <div className="mt-5">
            <SectionHeading>Videos in this session</SectionHeading>
            <div className="mt-4">
              <VideoGrid
                deleteAction={removeVideoFromSession}
                deleteConfirmDescription="Removes it from this session. The clip stays in your library."
                deleteConfirmTitle="Remove from this session?"
                deleteLabel="Remove"
                emptyMessage="No videos in this session yet. Upload one above or add an existing video."
                videos={session.videos}
              />
            </div>
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

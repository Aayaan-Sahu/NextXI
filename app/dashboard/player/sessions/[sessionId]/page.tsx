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
import { Badge, PageShell, SecondaryButton, TextInput } from "@/components/ui";
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

  return (
    <PageShell>
      <Link
        className="inline-block text-[13px] font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline"
        href="/dashboard/player/sessions"
      >
        ← All sessions
      </Link>

      <header className="mt-[18px] mb-[22px] flex items-end justify-between gap-4 max-md:flex-col max-md:items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[28px] leading-[1.05] font-bold tracking-[.02em] uppercase">
              {session.name}
            </h1>
            <Badge>{VIDEO_DISCIPLINES[session.category].label}</Badge>
          </div>
          <p className="mt-1.5 font-mono text-xs text-ink-600">
            {session.videos.length} {session.videos.length === 1 ? "video" : "videos"}
          </p>
        </div>
        <div className="flex items-end gap-2 max-sm:flex-col max-sm:items-stretch">
          <form action={renameSession} className="flex items-end gap-2">
            <input name="id" type="hidden" value={session.id} />
            <TextInput
              aria-label="Session name"
              defaultValue={session.name}
              maxLength={120}
              name="name"
              required
            />
            <SecondaryButton type="submit">Rename</SecondaryButton>
          </form>
          <form action={deleteSession}>
            <input name="id" type="hidden" value={session.id} />
            <SecondaryButton type="submit">Delete</SecondaryButton>
          </form>
        </div>
      </header>

      <div className="grid grid-cols-[1.55fr_1fr] items-start gap-7 max-lg:grid-cols-1">
        <div className="grid gap-6">
          <VideoUpload session={{ id: session.id, category: session.category }} />
          <SessionVideoPicker sessionId={session.id} videos={assignable} />
          <VideoGrid
            deleteAction={removeVideoFromSession}
            deleteLabel="Remove from session"
            emptyMessage="No videos in this session yet. Upload one above or add an existing video."
            videos={session.videos}
          />
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

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import {
  CoachStatus,
  PlayerStatus,
  Visibility,
} from "@/app/generated/prisma/enums";
import { requestConnectionToPlayer } from "@/app/dashboard/connections/actions";
import { SessionList } from "@/components/session-list";
import { Badge, PageHeader, PageShell } from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { getProfile, requireUser } from "@/lib/auth";
import { hasAcceptedConnection } from "@/lib/connections";
import { PLAYER_ROLE_LABELS } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import { getPlayerSessions } from "@/lib/sessions.server";
import { getReadyVideoGridItems } from "@/lib/videos.server";

export default async function CoachPlayerVideosPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "coach") redirect(`/dashboard/${profile.role}`);
  if (profile.coach.status !== CoachStatus.APPROVED) redirect("/dashboard/coach");

  const { playerId } = await params;

  if (!isUuid(playerId)) notFound();

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { name: true, roles: true, visibility: true, status: true },
  });

  if (!player) notFound();

  const connected = await hasAcceptedConnection(user.id, playerId);
  const viewable =
    connected ||
    (player.visibility === Visibility.PUBLIC &&
      player.status === PlayerStatus.ACTIVE);

  if (!viewable) notFound();

  const [videos, sessions] = await Promise.all([
    getReadyVideoGridItems(playerId),
    getPlayerSessions(playerId),
  ]);

  return (
    <PageShell>
      <Link
        className="mb-4 inline-block text-[13px] font-semibold text-rust-600 hover:text-rust-700"
        href="/dashboard/coach"
      >
        ← Dashboard
      </Link>
      <PageHeader
        subtitle="All of this player's videos, including ones you have already reviewed."
        title={player.name}
      />
      {!connected && (
        <form action={requestConnectionToPlayer} className="mb-6">
          <input name="playerId" type="hidden" value={playerId} />
          <button
            className="cursor-pointer rounded-md bg-gold-500 px-4 py-2 text-[13px] font-bold text-pitch-900 hover:bg-gold-600"
            type="submit"
          >
            Request to connect
          </button>
        </form>
      )}
      {player.roles.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {player.roles.map((role) => (
            <Badge key={role}>{PLAYER_ROLE_LABELS[role]}</Badge>
          ))}
        </div>
      )}
      {sessions.length > 0 && (
        <section className="mb-9">
          <h2 className="mb-4 font-display text-xl leading-tight font-semibold uppercase">
            Practice sessions
          </h2>
          <SessionList linkBase="/dashboard/coach/sessions" sessions={sessions} />
        </section>
      )}
      <VideoGrid
        emptyMessage="This player has not uploaded any videos yet."
        linkBase="/dashboard/coach/videos"
        videos={videos}
      />
    </PageShell>
  );
}

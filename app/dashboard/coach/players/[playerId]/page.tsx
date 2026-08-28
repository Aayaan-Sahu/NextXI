import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import {
  CoachStatus,
  PlayerStatus,
  Visibility,
} from "@/app/generated/prisma/enums";
import { requestConnectionToPlayer } from "@/app/dashboard/connections/actions";
import { PersonAvatar } from "@/components/connections";
import { SessionList } from "@/components/session-list";
import { SubmitButton } from "@/components/submit-button";
import { Chip, PageShell, SectionHeading, PageTitle } from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { getProfile, requireUser } from "@/lib/auth";
import { hasAcceptedConnection } from "@/lib/connections";
import { countryWithFlag, PLAYER_ROLE_LABELS } from "@/lib/players";
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

  // Usernames live on Profile, not Player — one handle per account, whatever
  // role that account holds. Fetched alongside, not after: the database is a
  // round trip away, so two awaits in a row cost twice as much as one.
  const [player, profileRow] = await Promise.all([
    prisma.player.findUnique({
      where: { id: playerId },
      select: {
        club: true,
        country: true,
        heightCm: true,
        name: true,
        roles: true,
        status: true,
        visibility: true,
      },
    }),
    prisma.profile.findUnique({
      where: { id: playerId },
      select: { username: true },
    }),
  ]);

  if (!player) notFound();

  const connected = await hasAcceptedConnection(user.id, playerId);
  const viewable =
    connected ||
    (player.visibility === Visibility.PUBLIC &&
      player.status === PlayerStatus.ACTIVE);

  if (!viewable) notFound();

  // A coach who isn't connected browses a public player as the player's own
  // audience would: a report their coach hasn't signed off reads "With your
  // coach", and held notes stay out of the counts.
  const [videos, sessions] = await Promise.all([
    getReadyVideoGridItems(playerId, connected ? "coach" : "player"),
    getPlayerSessions(playerId),
  ]);

  const identity = [
    profileRow?.username ? `@${profileRow.username}` : null,
    player.club,
    countryWithFlag(player.country),
    player.heightCm ? `${player.heightCm} cm` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell>
      <Link
        className="inline-block text-ui font-semibold text-rust-600 no-underline hover:text-rust-700"
        href={connected ? "/dashboard/coach" : "/dashboard/connections"}
      >
        ← {connected ? "Dashboard" : "Player directory"}
      </Link>

      <header className="mt-3.5 flex items-center justify-between gap-6 max-md:flex-col max-md:items-start">
        <div className="flex items-center gap-4">
          <PersonAvatar name={player.name} role="player" size="lg" />
          <div className="min-w-0">
            <PageTitle>{player.name}</PageTitle>
            {identity ? <p className="mt-1 text-ui text-ink-600">{identity}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {player.roles.map((role) => (
            <Chip key={role}>{PLAYER_ROLE_LABELS[role]}</Chip>
          ))}
          {connected ? null : (
            <form action={requestConnectionToPlayer}>
              <input name="playerId" type="hidden" value={playerId} />
              <SubmitButton className="ml-1 !px-[18px] !py-2 !text-ui">
                Request to connect
              </SubmitButton>
            </form>
          )}
        </div>
      </header>

      {connected ? null : (
        <div className="mt-5 flex items-center gap-3 rounded-lg border border-cream-400 bg-cream-100 px-4 py-3.5">
          <span aria-hidden className="text-caption">
            🔒
          </span>
          <p className="text-ui text-ink-800">
            This player is public, so you can watch their videos and reports. Practice sessions
            and messaging open once they accept your request.
          </p>
        </div>
      )}

      {sessions.length > 0 && (
        <section className="mt-9">
          <SectionHeading>Practice sessions</SectionHeading>
          <div className="mt-3">
            <SessionList linkBase="/dashboard/coach/sessions" sessions={sessions} />
          </div>
        </section>
      )}

      <section className="mt-9">
        <SectionHeading>{sessions.length > 0 ? "Standalone videos" : "Videos"}</SectionHeading>
        <div className="mt-4">
          <VideoGrid
            className="grid-cols-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1"
            emptyMessage="This player has not uploaded any videos yet."
            linkBase="/dashboard/coach/videos"
            videos={videos}
          />
        </div>
      </section>
    </PageShell>
  );
}

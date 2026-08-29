import Link from "next/link";
import { notFound } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import { PersonAvatar } from "@/components/connections";
import { Chip, PageShell, PageTitle, SectionHeading } from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { requireUser, redirectRolelessAdmin } from "@/lib/auth";
import { getClubAccess } from "@/lib/clubs.server";
import { hasAcceptedConnection } from "@/lib/connections";
import { ageInYears, PLAYER_ROLE_LABELS } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import { getReadyVideoGridItems } from "@/lib/videos.server";

/**
 * One of the club's players. The grid is built with the *player's* viewer, so
 * chips and comment counts read exactly as they do on the player's own page —
 * a club learns nothing about a report before the player does.
 */
export default async function ClubPlayerPage({
  params,
}: {
  params: Promise<{ clubId: string; playerId: string }>;
}) {
  const user = await requireUser();

  await redirectRolelessAdmin(user);

  const { clubId, playerId } = await params;

  if (!isUuid(clubId) || !isUuid(playerId)) notFound();

  const access = await getClubAccess(user.id, clubId);
  if (!access) notFound();
  if (!(await hasAcceptedConnection(clubId, playerId))) notFound();

  const [player, videos] = await Promise.all([
    prisma.player.findUnique({
      where: { id: playerId },
      select: { dateOfBirth: true, name: true, roles: true },
    }),
    getReadyVideoGridItems(playerId, "player"),
  ]);

  if (!player) notFound();

  return (
    <PageShell>
      <Link
        className="inline-block text-ui font-semibold text-rust-600 no-underline hover:text-rust-700"
        href={`/dashboard/club/${clubId}`}
      >
        ← {access.club.name}
      </Link>

      <header className="mt-3.5 flex items-center justify-between gap-6 max-md:flex-col max-md:items-start">
        <div className="flex items-center gap-4">
          <PersonAvatar name={player.name} role="player" size="lg" />
          <div className="min-w-0">
            <PageTitle>{player.name}</PageTitle>
            <p className="mt-1 text-ui text-ink-600">Aged {ageInYears(player.dateOfBirth)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {player.roles.map((role) => (
            <Chip key={role}>{PLAYER_ROLE_LABELS[role]}</Chip>
          ))}
        </div>
      </header>

      <section className="mt-9">
        <SectionHeading>Videos</SectionHeading>
        <div className="mt-4">
          <VideoGrid
            className="grid-cols-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1"
            emptyMessage="This player has not uploaded any videos yet."
            linkBase={`/dashboard/club/${clubId}/videos`}
            videos={videos}
          />
        </div>
      </section>
    </PageShell>
  );
}

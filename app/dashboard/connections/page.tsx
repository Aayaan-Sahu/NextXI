import { CoachStatus } from "@/app/generated/prisma/enums";
import { ClubDirectory } from "@/components/club-directory";
import { CoachDirectory } from "@/components/coach-directory";
import { CoachConnections, PendingColumn, PlayerConnections } from "@/components/connections";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { PlayerDirectory } from "@/components/player-directory";
import { PlayerSearch } from "@/components/player-search";
import { BarShell, Notice, SubBar, Tabs } from "@/components/ui";
import { requireUser, redirectRolelessAdmin } from "@/lib/auth";
import { getClubDirectory } from "@/lib/clubs.server";
import {
  getCoachDirectory,
  getConnectionPanelData,
  searchPlayers,
  searchPlayersByQuery,
} from "@/lib/connections";
import { isCountry, isPlayerRole } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  connectionError?: string | string[];
  connectionMessage?: string | string[];
  q?: string | string[];
  pq?: string | string[];
  discipline?: string | string[];
  country?: string | string[];
  searched?: string | string[];
  tab?: string | string[];
}>;

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();

  await redirectRolelessAdmin(user);

  const params = await searchParams;
  const connectionError = firstParam(params.connectionError);
  const connectionMessage = firstParam(params.connectionMessage);
  const query = firstParam(params.q) ?? "";
  const playerQuery = firstParam(params.pq) ?? "";
  const discipline = firstParam(params.discipline) ?? "";
  const country = firstParam(params.country) ?? "";
  const searched = firstParam(params.searched) === "1";

  const [player, coach] = await Promise.all([
    prisma.player.findUnique({ where: { id: user.id }, select: { id: true } }),
    prisma.coach.findUnique({
      where: { id: user.id },
      select: { status: true },
    }),
  ]);

  const canSearchPlayers = coach?.status === CoachStatus.APPROVED;

  const [connectionData, coaches, clubs, players, playerMatches] = await Promise.all([
    getConnectionPanelData(user.id),
    player ? getCoachDirectory(user.id, query) : Promise.resolve(null),
    // Players discover clubs the same way they discover coaches; the one
    // search box above filters both lists.
    player ? getClubDirectory(user.id, query) : Promise.resolve(null),
    canSearchPlayers && searched
      ? searchPlayers(user.id, {
          role: isPlayerRole(discipline) ? discipline : undefined,
          country: isCountry(country) ? country : undefined,
        })
      : Promise.resolve(null),
    player ? searchPlayersByQuery(user.id, playerQuery) : Promise.resolve(null),
  ]);

  const underReview = Boolean(coach) && !canSearchPlayers;
  const coachCount = connectionData.accepted.filter((p) => p.role === "coach").length;
  const playerCount = connectionData.accepted.length - coachCount;

  const tab = firstParam(params.tab);
  const active: "players" | "coaches" = tab === "coaches" ? "coaches" : "players";
  const href = (next: "players" | "coaches") => (next === "players" ? "?" : `?tab=${next}`);

  return (
    <BarShell
      bar={
        <SubBar title="Connections">
          <Tabs
            items={[
              {
                active: active === "players",
                href: href("players"),
                label: `Players ${playerCount}`,
              },
              {
                active: active === "coaches",
                href: href("coaches"),
                label: `Coaches ${coachCount}`,
              },
            ]}
          />
        </SubBar>
      }
    >
      <DashboardReveal className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <DashboardRevealItem className="grid gap-7" index={0}>
          <div className="grid gap-2.5 empty:hidden">
            <Notice tone="error">{connectionError}</Notice>
            <Notice>{connectionMessage}</Notice>
            {underReview ? (
              <Notice tone="error">
                Your coach account is still under review — connections open once an admin
                approves it.
              </Notice>
            ) : null}
          </div>

          {active === "players" ? (
            <>
              {playerMatches ? <PlayerSearch players={playerMatches} query={playerQuery} /> : null}
              {canSearchPlayers ? (
                <PlayerDirectory
                  country={country}
                  discipline={discipline}
                  players={players ?? []}
                  searched={searched}
                />
              ) : null}
              <PlayerConnections data={connectionData} />
            </>
          ) : (
            <>
              <CoachConnections data={connectionData} />
              {coaches ? <CoachDirectory coaches={coaches} query={query} /> : null}
              {clubs ? <ClubDirectory clubs={clubs} query={query} /> : null}
            </>
          )}
        </DashboardRevealItem>

        <DashboardRevealItem className="lg:border-l lg:border-cream-400 lg:pl-6" index={1}>
          <PendingColumn data={connectionData} />
        </DashboardRevealItem>
      </DashboardReveal>
    </BarShell>
  );
}

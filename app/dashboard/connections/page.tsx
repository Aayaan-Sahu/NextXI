import { redirect } from "next/navigation";
import { CoachStatus } from "@/app/generated/prisma/enums";
import { CoachDirectory } from "@/components/coach-directory";
import { ConnectionsPanel } from "@/components/connections";
import { PlayerDirectory } from "@/components/player-directory";
import { Notice, PageHeader, PageShell } from "@/components/ui";
import { isAdmin, requireUser } from "@/lib/auth";
import {
  getCoachDirectory,
  getConnectionPanelData,
  searchPlayers,
} from "@/lib/connections";
import { isCountry, isPlayerRole } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  connectionError?: string | string[];
  connectionMessage?: string | string[];
  q?: string | string[];
  discipline?: string | string[];
  country?: string | string[];
  searched?: string | string[];
}>;

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const params = await searchParams;
  const connectionError = firstParam(params.connectionError);
  const connectionMessage = firstParam(params.connectionMessage);
  const query = firstParam(params.q) ?? "";
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

  const [connectionData, coaches, players] = await Promise.all([
    getConnectionPanelData(user.id),
    player ? getCoachDirectory(user.id, query) : Promise.resolve(null),
    canSearchPlayers && searched
      ? searchPlayers(user.id, {
          role: isPlayerRole(discipline) ? discipline : undefined,
          country: isCountry(country) ? country : undefined,
        })
      : Promise.resolve(null),
  ]);

  return (
    <PageShell>
      <PageHeader
        subtitle="Find players and coaches by username and manage your requests."
        title="Connections"
      />
      <Notice tone="error">{connectionError}</Notice>
      <Notice>{connectionMessage}</Notice>
      <div
        className={`grid items-start gap-6 ${
          canSearchPlayers
            ? "lg:grid-cols-[1fr_1.25fr]"
            : "lg:grid-cols-[1.25fr_1fr]"
        }`}
      >
        {coaches ? <CoachDirectory coaches={coaches} query={query} /> : null}
        <ConnectionsPanel data={connectionData} />
        {canSearchPlayers ? (
          <PlayerDirectory
            country={country}
            discipline={discipline}
            players={players ?? []}
            searched={searched}
          />
        ) : null}
      </div>
    </PageShell>
  );
}

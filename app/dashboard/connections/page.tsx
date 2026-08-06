import { redirect } from "next/navigation";
import { CoachStatus } from "@/app/generated/prisma/enums";
import { CoachDirectory } from "@/components/coach-directory";
import { ConnectionsPanel } from "@/components/connections";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { PlayerDirectory } from "@/components/player-directory";
import { Notice, PageShell, StatusBand, StatusBoard } from "@/components/ui";
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

/**
 * Role-neutral: this page serves players and coaches alike, so the voice can't
 * assume a player's XI. A coach awaiting approval gets its own line — every
 * send path rejects them with "still under review" (see actions.ts), and
 * neither directory renders for that role, so telling them to find someone
 * would point at UI they never see.
 */
function connectionNote(
  incoming: number,
  connected: number,
  underReview: boolean,
) {
  if (underReview) {
    return "Your coach account is still under review — connections open once an admin approves it.";
  }
  if (incoming > 0) return "Requests are waiting on your answer.";
  if (connected === 0) {
    return "Nothing connected yet — send a request by username to start.";
  }
  return "Connections decide who can message you and who sees your work.";
}

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

  const underReview = Boolean(coach) && !canSearchPlayers;
  const incoming = connectionData.incomingPending.length;
  const outgoing = connectionData.outgoingPending.length;
  const connected = connectionData.accepted.length;
  const stats = [
    `${connected} connected`,
    `${incoming} incoming`,
    `${outgoing} outgoing`,
  ];

  return (
    <PageShell>
      <DashboardReveal className="grid gap-9">
        <DashboardRevealItem index={0}>
          <StatusBand>
            <StatusBoard
              kicker="CONNECTIONS"
              note={connectionNote(incoming, connected, underReview)}
              stats={stats}
              title="Your network."
            />
          </StatusBand>
        </DashboardRevealItem>

        <DashboardRevealItem index={1}>
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
        </DashboardRevealItem>
      </DashboardReveal>
    </PageShell>
  );
}

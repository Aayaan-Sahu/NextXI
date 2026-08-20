import { redirect } from "next/navigation";
import { CoachStatus } from "@/app/generated/prisma/enums";
import { sendConnectionRequest } from "@/app/dashboard/connections/actions";
import { CoachDirectory } from "@/components/coach-directory";
import { ConnectionsRoster, PendingColumn } from "@/components/connections";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { PlayerDirectory } from "@/components/player-directory";
import { SubmitButton } from "@/components/submit-button";
import { BarShell, Notice, SubBar, Tabs, TextInput } from "@/components/ui";
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
  tab?: string | string[];
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

  const underReview = Boolean(coach) && !canSearchPlayers;
  const incoming = connectionData.incomingPending.length;
  const connected = connectionData.accepted.length;
  const coachCount = connectionData.accepted.filter((p) => p.role === "coach").length;
  const playerCount = connected - coachCount;

  const tab = firstParam(params.tab);
  const active: "all" | "coaches" | "players" | "pending" =
    tab === "coaches" || tab === "players" || tab === "pending" ? tab : "all";
  const href = (next: string) => (next === "all" ? "?" : `?tab=${next}`);

  return (
    <BarShell
      bar={
        <SubBar title="Connections">
          <Tabs
            items={[
              { active: active === "all", href: href("all"), label: `All ${connected}` },
              {
                active: active === "coaches",
                href: href("coaches"),
                label: `Coaches ${coachCount}`,
              },
              {
                active: active === "players",
                href: href("players"),
                label: `Players ${playerCount}`,
              },
              {
                active: active === "pending",
                badge: incoming,
                href: href("pending"),
                label: "Pending",
              },
            ]}
          />
          <form
            action={sendConnectionRequest}
            className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2.5"
          >
            <TextInput
              aria-label="Name or username"
              className="min-w-0 sm:w-[260px]"
              name="query"
              placeholder="Name or @username"
              required
              type="text"
            />
            <SubmitButton className="shrink-0 !px-4 !py-2 !text-ui">
              Send request
            </SubmitButton>
          </form>
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

          {active === "pending" ? (
            <PendingColumn data={connectionData} />
          ) : (
            <ConnectionsRoster data={connectionData} filter={active} />
          )}

          {coaches ? <CoachDirectory coaches={coaches} query={query} /> : null}
          {canSearchPlayers ? (
            <PlayerDirectory
              country={country}
              discipline={discipline}
              players={players ?? []}
              searched={searched}
            />
          ) : null}
        </DashboardRevealItem>

        {/* The rail is where pending requests live — unless the Pending tab has
            already moved them into the main column, in which case it goes. */}
        {active === "pending" ? null : (
          <DashboardRevealItem
            className="lg:border-l lg:border-cream-400 lg:pl-6"
            index={1}
          >
            <PendingColumn data={connectionData} />
          </DashboardRevealItem>
        )}
      </DashboardReveal>
    </BarShell>
  );
}

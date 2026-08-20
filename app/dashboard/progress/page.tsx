import { redirect } from "next/navigation";
import { PlayerStatus } from "@/app/generated/prisma/enums";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { GoalsReminders } from "@/components/goals-reminders";
import { deriveSeason, ProgressCharts, SeasonStats } from "@/components/progress-charts";
import { MatchLog, StatEntryForm } from "@/components/stat-entry-form";
import { StatsLink } from "@/components/stats-link";
import { TechniqueTrends } from "@/components/technique-trends";
import { Notice, PageHeader, PageShell } from "@/components/ui";
import { getProfile, isAdmin, requireUser } from "@/lib/auth";
import { getTechniqueTrends } from "@/lib/metric-trends";
import { getProgressData } from "@/lib/progress";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  error?: string | string[];
  message?: string | string[];
}>;

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "player") redirect("/dashboard");
  if (profile.player.status === PlayerStatus.PENDING_GUARDIAN) {
    redirect("/dashboard/player");
  }

  const [{ entries, goals, reminders }, trends] = await Promise.all([
    getProgressData(user.id),
    getTechniqueTrends(user.id),
  ]);

  const params = await searchParams;
  const error = firstParam(params.error);
  const message = firstParam(params.message);

  const season = deriveSeason(entries);
  const latestEntry = entries[0]?.matchDate ?? null;
  const stats = [
    `${entries.length} match${entries.length === 1 ? "" : "es"} logged`,
    `${goals.length} goal${goals.length === 1 ? "" : "s"}`,
    latestEntry
      ? `last entry ${latestEntry.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        })}`
      : "no entries yet",
  ];

  return (
    <PageShell>
      <DashboardReveal className="grid gap-7">
        <DashboardRevealItem index={0}>
          <PageHeader
            action={
              <a
                className="inline-flex cursor-pointer items-center rounded-md bg-gold-500 px-5 py-2.5 text-ui font-semibold text-ink-900 no-underline hover:bg-gold-600"
                href="#log-a-match"
              >
                Log a match
              </a>
            }
            subtitle={stats.join(" · ")}
            title="Progress"
          />
        </DashboardRevealItem>

        {error || message ? (
          <DashboardRevealItem className="grid gap-2.5" index={1}>
            <Notice tone="error">{error}</Notice>
            <Notice>{message}</Notice>
          </DashboardRevealItem>
        ) : null}

        <DashboardRevealItem index={2}>
          <SeasonStats season={season} />
        </DashboardRevealItem>

        <DashboardRevealItem
          className="mt-3 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px]"
          index={3}
        >
          <div className="grid gap-10">
            <ProgressCharts entries={entries} />
            <MatchLog entries={entries} />
            <StatEntryForm />
          </div>
          <div className="grid gap-9">
            <GoalsReminders goals={goals} reminders={reminders} />
            <TechniqueTrends trends={trends} />
            <StatsLink statsUrl={profile.player.statsUrl} />
          </div>
        </DashboardRevealItem>
      </DashboardReveal>
    </PageShell>
  );
}

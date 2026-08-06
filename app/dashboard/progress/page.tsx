import { redirect } from "next/navigation";
import { PlayerStatus } from "@/app/generated/prisma/enums";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import { GoalsReminders } from "@/components/goals-reminders";
import { ProgressCharts } from "@/components/progress-charts";
import { MatchLog, StatEntryForm } from "@/components/stat-entry-form";
import { StatsLink } from "@/components/stats-link";
import { TechniqueTrends } from "@/components/technique-trends";
import { Notice, PageShell, StatusBand, StatusBoard } from "@/components/ui";
import { getProfile, isAdmin, requireUser } from "@/lib/auth";
import { getTechniqueTrends } from "@/lib/metric-trends";
import { getProgressData } from "@/lib/progress";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  error?: string | string[];
  message?: string | string[];
}>;

function progressNote(entryCount: number, goalCount: number) {
  if (entryCount === 0) {
    return "Log your first match and the scoreboard starts writing itself.";
  }
  if (goalCount === 0) {
    return "The numbers are in — set a goal so the next session has a target.";
  }
  return "Keep logging matches and watching the trends — that's how form sticks.";
}

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

  const trendCount = trends.batting.length + trends.bowling.length;
  const stats = [
    `${entries.length} match${entries.length === 1 ? "" : "es"} logged`,
    `${goals.length} goal${goals.length === 1 ? "" : "s"}`,
    `${reminders.length} reminder${reminders.length === 1 ? "" : "s"}`,
    `${trendCount} technique trend${trendCount === 1 ? "" : "s"}`,
  ];

  return (
    <PageShell>
      <DashboardReveal className="grid gap-9">
        <DashboardRevealItem index={0}>
          <StatusBand>
            <StatusBoard
              kicker="PROGRESS"
              note={progressNote(entries.length, goals.length)}
              stats={stats}
              title="Form & goals."
            />
          </StatusBand>
        </DashboardRevealItem>

        <DashboardRevealItem index={1}>
          <Notice tone="error">{error}</Notice>
          <Notice>{message}</Notice>
          <div className="grid gap-6">
            <ProgressCharts entries={entries} />
            <TechniqueTrends trends={trends} />
            <StatsLink statsUrl={profile.player.statsUrl} />
            <StatEntryForm />
            <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
              <MatchLog entries={entries} />
              <GoalsReminders goals={goals} reminders={reminders} />
            </div>
          </div>
        </DashboardRevealItem>
      </DashboardReveal>
    </PageShell>
  );
}

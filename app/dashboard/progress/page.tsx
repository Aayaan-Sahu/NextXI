import { redirect } from "next/navigation";
import { PlayerStatus } from "@/app/generated/prisma/enums";
import { GoalsReminders } from "@/components/goals-reminders";
import { ProgressCharts } from "@/components/progress-charts";
import { MatchLog, StatEntryForm } from "@/components/stat-entry-form";
import { Notice, PageHeader, PageShell } from "@/components/ui";
import { getProfile, isAdmin, requireUser } from "@/lib/auth";
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

  const { entries, goals, reminders } = await getProgressData(user.id);

  const params = await searchParams;
  const error = firstParam(params.error);
  const message = firstParam(params.message);

  return (
    <PageShell>
      <PageHeader
        subtitle="Log your matches, watch your trends, and set goals to work towards."
        title="Progress"
      />
      <Notice tone="error">{error}</Notice>
      <Notice>{message}</Notice>
      <div className="grid gap-5">
        <ProgressCharts entries={entries} />
        <StatEntryForm />
        <MatchLog entries={entries} />
        <GoalsReminders goals={goals} reminders={reminders} />
      </div>
    </PageShell>
  );
}

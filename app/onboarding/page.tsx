import { redirect } from "next/navigation";
import { CoachOnboardingPanel, PlayerOnboardingPanel } from "@/components/onboarding";
import { Notice, PageHeader, PageShell, SignOutButton } from "@/components/ui";
import { getOnboardingStatus, isAdmin, requireUser } from "@/lib/auth";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{ error?: string | string[] }>;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const status = await getOnboardingStatus(user.id);

  if (status.role) redirect("/dashboard");

  const error = firstParam((await searchParams).error);

  return (
    <PageShell>
      <PageHeader action={<SignOutButton />} subtitle={user.email} title="Finish onboarding" />
      <Notice tone="error">{error}</Notice>

      <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
        <PlayerOnboardingPanel />
        <CoachOnboardingPanel />
      </div>
    </PageShell>
  );
}

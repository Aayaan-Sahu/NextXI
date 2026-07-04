import { redirect } from "next/navigation";
import { OnboardingPanel } from "@/components/onboarding";
import { getOnboardingStatus, isAdmin, requireUser } from "@/lib/auth";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  error?: string | string[];
  role?: string | string[];
}>;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const status = await getOnboardingStatus(user.id);

  if (status.role) redirect("/dashboard");

  const params = await searchParams;
  const roleParam = firstParam(params.role);
  const role =
    roleParam === "player" || roleParam === "coach" || roleParam === "guardian"
      ? roleParam
      : undefined;

  return (
    <OnboardingPanel
      email={user.email}
      error={firstParam(params.error)}
      role={role}
    />
  );
}

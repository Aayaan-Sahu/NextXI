import { redirect } from "next/navigation";
import { OnboardingPanel } from "@/components/onboarding";
import { getOnboardingStatus, isAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const [params, profile] = await Promise.all([
    searchParams,
    prisma.profile.findUnique({
      where: { id: user.id },
      select: { username: true },
    }),
  ]);
  const roleParam = firstParam(params.role);
  const role =
    roleParam === "coach" || roleParam === "guardian" ? roleParam : "player";

  return (
    <OnboardingPanel
      email={user.email}
      error={firstParam(params.error)}
      role={role}
      username={profile?.username}
    />
  );
}

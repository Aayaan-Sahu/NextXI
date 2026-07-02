import { redirect } from "next/navigation";
import { ProfilePanel } from "@/components/profile";
import { PageHeader, PageShell, SignOutButton } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";

export default async function CoachDashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "coach") redirect("/dashboard/player");

  return (
    <PageShell>
      <PageHeader
        action={<SignOutButton />}
        subtitle={user.email}
        title={`Welcome ${profile.coach.name}, coach`}
      />
      <ProfilePanel profile={profile} />
    </PageShell>
  );
}

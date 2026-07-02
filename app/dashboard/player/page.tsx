import { redirect } from "next/navigation";
import { ProfilePanel } from "@/components/profile";
import { PageHeader, PageShell, SignOutButton } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";

export default async function PlayerDashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "player") redirect("/dashboard/coach");

  return (
    <PageShell>
      <PageHeader
        action={<SignOutButton />}
        subtitle={user.email}
        title={`Welcome ${profile.player.name}, player`}
      />
      <ProfilePanel profile={profile} />
    </PageShell>
  );
}

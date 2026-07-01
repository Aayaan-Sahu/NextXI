import { redirect } from "next/navigation";
import { ProfilePanel } from "@/components/profile";
import { PageHeader, PageShell, SignOutButton } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");

  return (
    <PageShell>
      <PageHeader action={<SignOutButton />} subtitle={user.email} title="Dashboard" />
      <ProfilePanel profile={profile} />
    </PageShell>
  );
}

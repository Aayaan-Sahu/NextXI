import { DashboardNav } from "@/components/dashboard-nav";
import { getCurrentUser, getProfile, isAdmin } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || isAdmin(user)) return children;

  const profile = await getProfile(user.id);

  if (!profile.role) return children;

  const name = profile.role === "player" ? profile.player.name : profile.coach.name;

  return (
    <>
      <DashboardNav
        homeHref={`/dashboard/${profile.role}`}
        initial={name.charAt(0).toUpperCase()}
      />
      {children}
    </>
  );
}

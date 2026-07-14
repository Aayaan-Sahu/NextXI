import { PlayerStatus } from "@/app/generated/prisma/enums";
import { DashboardNav } from "@/components/dashboard-nav";
import { getAvatarUrl } from "@/lib/avatars.server";
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

  const name =
    profile.role === "player"
      ? profile.player.name
      : profile.role === "coach"
        ? profile.coach.name
        : profile.guardian.name;
  const limited =
    profile.role === "guardian" ||
    (profile.role === "player" && profile.player.status === PlayerStatus.PENDING_GUARDIAN);
  const avatarPath =
    profile.role === "player"
      ? profile.player.avatarPath
      : profile.role === "coach"
        ? profile.coach.avatarPath
        : null;
  const avatarUrl = await getAvatarUrl(avatarPath);

  return (
    <>
      <DashboardNav
        avatarUrl={avatarUrl}
        homeHref={`/dashboard/${profile.role}`}
        initial={name.charAt(0).toUpperCase()}
        limited={limited}
      />
      {children}
    </>
  );
}

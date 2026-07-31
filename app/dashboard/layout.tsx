import { ConnectionStatus, PlayerStatus } from "@/app/generated/prisma/enums";
import { DashboardNav } from "@/components/dashboard-nav";
import { MessagesRealtime } from "@/components/messages-realtime";
import { getAvatarUrl } from "@/lib/avatars.server";
import { getCurrentUser, getProfile, isAdmin } from "@/lib/auth";
import { getUnreadMessageCount } from "@/lib/messages";
import { prisma } from "@/lib/prisma";

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
  // Guardians and pending players have no Messages link, so skip their count.
  // Accepted-connection ids feed the realtime provider that keeps the badge
  // (and the messages surfaces) fresh from any dashboard page.
  const [avatarUrl, unreadMessages, connections] = await Promise.all([
    getAvatarUrl(avatarPath),
    limited ? Promise.resolve(0) : getUnreadMessageCount(user.id),
    limited
      ? Promise.resolve([])
      : prisma.connection.findMany({
          where: {
            status: ConnectionStatus.ACCEPTED,
            OR: [{ userAId: user.id }, { userBId: user.id }],
          },
          select: { id: true },
        }),
  ]);

  const nav = (
    <>
      <DashboardNav
        avatarUrl={avatarUrl}
        homeHref={`/dashboard/${profile.role}`}
        initial={name.charAt(0).toUpperCase()}
        limited={limited}
        unreadMessages={unreadMessages}
      />
      {children}
    </>
  );

  if (limited) return nav;

  return (
    <MessagesRealtime connectionIds={connections.map((connection) => connection.id)}>
      {nav}
    </MessagesRealtime>
  );
}

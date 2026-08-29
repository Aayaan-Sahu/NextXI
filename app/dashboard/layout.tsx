import { CoachStatus, ConnectionStatus, PlayerStatus } from "@/app/generated/prisma/enums";
import { DashboardNav } from "@/components/dashboard-nav";
import { MessagesRealtime } from "@/components/messages-realtime";
import { getAdminPreview } from "@/lib/admin-preview";
import { getAvatarUrl } from "@/lib/avatars.server";
import { getCurrentUser, getProfile, isAdmin } from "@/lib/auth";
import { getUnreadMessageCount } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getAwaitingReviewCount } from "@/lib/report-review.server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) return children;

  // An administrator reading a coach's dashboard gets that coach's chrome:
  // the nav, and the badge counting reports waiting on their signature, are
  // part of what there is to look at. Messages are not — a preview never
  // opens somebody else's conversations or subscribes to their channels.
  const preview = await getAdminPreview(user);
  const subjectId = preview?.coachId ?? user.id;
  const profile = await getProfile(subjectId);

  // A roleless administrator has only the console, and that brings its own
  // bar. An administrator who also signed up as a player or a coach gets the
  // nav for that account, with the console one click away in the menu.
  if (!profile.role) return children;

  const name =
    profile.role === "player"
      ? profile.player.name
      : profile.role === "coach"
        ? profile.coach.name
        : profile.role === "club"
          ? profile.club.name
          : profile.guardian.name;
  const limited =
    profile.role === "guardian" ||
    (profile.role === "player" && profile.player.status === PlayerStatus.PENDING_GUARDIAN);
  const avatarPath =
    profile.role === "player"
      ? profile.player.avatarPath
      : profile.role === "coach"
        ? profile.coach.avatarPath
        : profile.role === "club"
          ? profile.club.crestPath
          : null;
  // Guardians and pending players have no Messages link, so skip their count.
  // Accepted-connection ids feed the realtime provider that keeps the badge
  // (and the messages surfaces) fresh from any dashboard page.
  // An approved coach's Home carries the reports waiting on their sign-off.
  const [avatarUrl, unreadMessages, pendingReviews, connections] = await Promise.all([
    getAvatarUrl(avatarPath),
    limited || preview ? Promise.resolve(0) : getUnreadMessageCount(user.id),
    profile.role === "coach" && profile.coach.status === CoachStatus.APPROVED
      ? getAwaitingReviewCount(subjectId)
      : Promise.resolve(0),
    limited || preview
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
        adminHref={isAdmin(user) ? "/dashboard/admin" : undefined}
        avatarUrl={avatarUrl}
        homeHref={`/dashboard/${profile.role}`}
        initial={name.charAt(0).toUpperCase()}
        canEditProfile={profile.role !== "club"}
        limited={limited}
        pendingReviews={pendingReviews}
        unreadMessages={unreadMessages}
      />
      {children}
    </>
  );

  if (limited || preview) return nav;

  return (
    <MessagesRealtime connectionIds={connections.map((connection) => connection.id)}>
      {nav}
    </MessagesRealtime>
  );
}

import { redirect } from "next/navigation";
import { CoachStatus, PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { ConnectionsPanel } from "@/components/connections";
import { CoachVideos } from "@/components/coach-videos";
import { ProfilePanel } from "@/components/profile";
import { MessagesLink, Notice, PageHeader, PageShell, Panel, SignOutButton } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { getAcceptedCounterpartIds, getConnectionPanelData } from "@/lib/connections";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  connectionError?: string | string[];
  connectionMessage?: string | string[];
}>;

export default async function CoachDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "coach") redirect("/dashboard/player");

  const params = await searchParams;
  const connectionError = firstParam(params.connectionError);
  const connectionMessage = firstParam(params.connectionMessage);

  if (profile.coach.status !== CoachStatus.APPROVED) {
    const rejected = profile.coach.status === CoachStatus.REJECTED;

    return (
      <PageShell>
        <PageHeader
          action={<SignOutButton />}
          subtitle={user.email}
          title={`Welcome ${profile.coach.name}, coach`}
        />
        <Panel title={rejected ? "Account not approved" : "Account under review"}>
          <p className="text-sm text-stone-600 dark:text-neutral-300">
            {rejected
              ? "Your coach account was not approved. If you believe this is a mistake, please contact support."
              : "Thanks for signing up. To keep the platform safe for young athletes, an administrator reviews every coach before activation. You'll gain full access once you're approved."}
          </p>
        </Panel>
      </PageShell>
    );
  }

  const connectedPlayerIds = await getAcceptedCounterpartIds(user.id);
  const [connectionData, videos] = await Promise.all([
    getConnectionPanelData(user.id),
    prisma.playerVideo.findMany({
      where: {
        status: PlayerVideoStatus.READY,
        playerId: { in: connectedPlayerIds },
      },
      orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        originalFilename: true,
        player: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return (
    <PageShell>
      <PageHeader
        action={
          <div className="flex items-center gap-2">
            <MessagesLink />
            <SignOutButton />
          </div>
        }
        subtitle={user.email}
        title={`Welcome ${profile.coach.name}, coach`}
      />
      <Notice tone="error">{connectionError}</Notice>
      <Notice>{connectionMessage}</Notice>
      <div className="grid gap-5">
        <ProfilePanel profile={profile} />
        <CoachVideos videos={videos} />
        <ConnectionsPanel data={connectionData} />
      </div>
    </PageShell>
  );
}

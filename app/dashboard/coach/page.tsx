import { redirect } from "next/navigation";
import { CoachConnectionStatus, PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { ConnectionsPanel } from "@/components/connections";
import { CoachVideos } from "@/components/coach-videos";
import { ProfilePanel } from "@/components/profile";
import { Notice, PageHeader, PageShell, SignOutButton } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { getConnectionPanelData } from "@/lib/connections";
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

  const [connectionData, videos] = await Promise.all([
    getConnectionPanelData(user.id, "coach"),
    prisma.playerVideo.findMany({
      where: {
        status: PlayerVideoStatus.READY,
        player: {
          coachConnections: {
            some: {
              coachId: user.id,
              status: CoachConnectionStatus.ACCEPTED,
            },
          },
        },
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
  const params = await searchParams;
  const connectionError = firstParam(params.connectionError);
  const connectionMessage = firstParam(params.connectionMessage);

  return (
    <PageShell>
      <PageHeader
        action={<SignOutButton />}
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

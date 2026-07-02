import { redirect } from "next/navigation";
import { PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { ConnectionsPanel } from "@/components/connections";
import { ProfilePanel } from "@/components/profile";
import { Notice, PageHeader, PageShell, SignOutButton } from "@/components/ui";
import { VideoUpload } from "@/components/video-upload";
import { getProfile, requireUser } from "@/lib/auth";
import { getConnectionPanelData } from "@/lib/connections";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  connectionError?: string | string[];
  connectionMessage?: string | string[];
}>;

export default async function PlayerDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "player") redirect("/dashboard/coach");

  const [connectionData, videos] = await Promise.all([
    getConnectionPanelData(user.id, "player"),
    prisma.playerVideo.findMany({
      where: {
        playerId: user.id,
        status: PlayerVideoStatus.READY,
      },
      orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
      select: {
        contentType: true,
        createdAt: true,
        id: true,
        originalFilename: true,
        sizeBytes: true,
        status: true,
        uploadedAt: true,
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
        title={`Welcome ${profile.player.name}, player`}
      />
      <Notice tone="error">{connectionError}</Notice>
      <Notice>{connectionMessage}</Notice>
      <div className="grid gap-5">
        <ProfilePanel profile={profile} />
        <VideoUpload
          initialVideos={videos.map((video) => ({
            id: video.id,
            originalFilename: video.originalFilename,
            contentType: video.contentType,
            sizeBytes: video.sizeBytes,
            status: "READY" as const,
            uploadedAt: video.uploadedAt?.toISOString() ?? null,
            createdAt: video.createdAt.toISOString(),
          }))}
        />
        <ConnectionsPanel data={connectionData} />
      </div>
    </PageShell>
  );
}

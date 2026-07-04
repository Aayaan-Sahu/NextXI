import { redirect } from "next/navigation";
import { CoachStatus, PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { PageHeader, PageShell, Panel } from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { getProfile, requireUser } from "@/lib/auth";
import { getAcceptedCounterpartIds } from "@/lib/connections";
import { prisma } from "@/lib/prisma";
import { getThumbnailUrlByPath } from "@/lib/videos.server";

export default async function CoachDashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "coach") redirect(`/dashboard/${profile.role}`);

  if (profile.coach.status !== CoachStatus.APPROVED) {
    const rejected = profile.coach.status === CoachStatus.REJECTED;

    return (
      <PageShell>
        <PageHeader subtitle={user.email} title={`Welcome ${profile.coach.name}, coach`} />
        <Panel title={rejected ? "Account not approved" : "Account under review"}>
          <p className="text-sm text-stone-600">
            {rejected
              ? "Your coach account was not approved. If you believe this is a mistake, please contact support."
              : "Thanks for signing up. To keep the platform safe for young athletes, an administrator reviews every coach before activation. You'll gain full access once you're approved."}
          </p>
        </Panel>
      </PageShell>
    );
  }

  const connectedPlayerIds = await getAcceptedCounterpartIds(user.id);
  const videos = await prisma.playerVideo.findMany({
    where: {
      status: PlayerVideoStatus.READY,
      playerId: { in: connectedPlayerIds },
    },
    orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
    select: {
      createdAt: true,
      id: true,
      originalFilename: true,
      sizeBytes: true,
      thumbnailPath: true,
      uploadedAt: true,
      player: {
        select: {
          name: true,
        },
      },
    },
  });

  const thumbnailUrlByPath = await getThumbnailUrlByPath(
    videos.flatMap((video) => video.thumbnailPath ?? []),
  );

  return (
    <PageShell>
      <PageHeader
        subtitle="Videos from players you are connected with."
        title={`Welcome ${profile.coach.name}, coach`}
      />
      <VideoGrid
        emptyMessage="No videos yet. Videos from connected players will appear here."
        linkBase="/dashboard/coach/videos"
        videos={videos.map((video) => ({
          ...video,
          playerName: video.player.name,
          thumbnailUrl: video.thumbnailPath
            ? (thumbnailUrlByPath.get(video.thumbnailPath) ?? null)
            : null,
        }))}
      />
    </PageShell>
  );
}

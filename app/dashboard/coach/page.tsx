import { redirect } from "next/navigation";
import { CoachStatus, PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { CoachPlayers } from "@/components/coach-players";
import { PageHeader, PageShell, Panel } from "@/components/ui";
import { VideoFilterBar } from "@/components/video-filter-bar";
import { VideoGrid } from "@/components/video-grid";
import { getProfile, requireUser } from "@/lib/auth";
import { describeUsers, getAcceptedCounterpartIds } from "@/lib/connections";
import { prisma } from "@/lib/prisma";
import { getThumbnailUrlByPath } from "@/lib/videos.server";
import { formatVideoTags, isHandedness, isVideoDiscipline } from "@/lib/videos";

export default async function CoachDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ discipline?: string; variation?: string; handedness?: string }>;
}) {
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

  const { discipline, variation, handedness } = await searchParams;
  const connectedIds = await getAcceptedCounterpartIds(user.id);
  const people = await describeUsers(connectedIds);
  const players = connectedIds
    .filter((id) => people.get(id)?.role === "player")
    .map((id) => ({ id, name: people.get(id)?.name ?? "Unknown" }));

  const videos = await prisma.playerVideo.findMany({
    where: {
      status: PlayerVideoStatus.READY,
      playerId: { in: players.map((player) => player.id) },
      views: { none: { viewerId: user.id } },
      ...(isVideoDiscipline(discipline) ? { category: discipline } : {}),
      ...(variation ? { variation } : {}),
      ...(isHandedness(handedness) ? { handedness } : {}),
    },
    orderBy: [{ uploadedAt: "desc" }, { createdAt: "desc" }],
    select: {
      category: true,
      createdAt: true,
      handedness: true,
      id: true,
      originalFilename: true,
      sizeBytes: true,
      thumbnailPath: true,
      uploadedAt: true,
      variation: true,
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
        subtitle="New videos from players you are connected with. Open a video to mark it as reviewed."
        title={`Welcome ${profile.coach.name}, coach`}
      />
      <div className="grid gap-6">
        <CoachPlayers players={players} />
        <VideoFilterBar />
        <VideoGrid
          emptyMessage="No unviewed videos. Visit a player from the Players panel to rewatch their videos."
          linkBase="/dashboard/coach/videos"
          videos={videos.map((video) => ({
            ...video,
            playerName: video.player.name,
            tagLabel: formatVideoTags(video.category, video.variation, video.handedness),
            thumbnailUrl: video.thumbnailPath
              ? (thumbnailUrlByPath.get(video.thumbnailPath) ?? null)
              : null,
          }))}
        />
      </div>
    </PageShell>
  );
}

import { redirect } from "next/navigation";
import { CoachStatus, PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { CoachPlayers } from "@/components/coach-players";
import { GatePanel, Kicker, PageShell, StatusBoard } from "@/components/ui";
import { VideoFilterBar } from "@/components/video-filter-bar";
import { VideoGrid } from "@/components/video-grid";
import { getProfile, requireUser } from "@/lib/auth";
import { describeUsers, getAcceptedCounterpartIds } from "@/lib/connections";
import { prisma } from "@/lib/prisma";
import { effectiveReportStatus, getThumbnailUrlByPath } from "@/lib/videos.server";
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
        <div className="-mx-6 mb-2 bg-cream-100/80 px-6 py-6 sm:-mx-12 sm:rounded-[12px] sm:px-12">
          <GatePanel
            description={
              <p>
                {rejected
                  ? "Your coach account was not approved. If you believe this is a mistake, please contact support."
                  : "Thanks for signing up. To keep the platform safe for young athletes, an administrator reviews every coach before activation. You'll gain full access once you're approved."}
              </p>
            }
            kicker={rejected ? "NOT APPROVED" : "UNDER REVIEW"}
            title={`Welcome ${profile.coach.name}`}
          />
        </div>
      </PageShell>
    );
  }

  const { discipline, variation, handedness } = await searchParams;
  const connectedIds = await getAcceptedCounterpartIds(user.id);
  const people = await describeUsers(connectedIds);
  const playerIds = connectedIds.filter((id) => people.get(id)?.role === "player");
  const playerRoles = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, roles: true },
  });
  const rolesById = new Map(playerRoles.map((player) => [player.id, player.roles]));
  const players = playerIds.map((id) => ({
    id,
    name: people.get(id)?.name ?? "Unknown",
    roles: rolesById.get(id) ?? [],
  }));

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
      report: { select: { status: true, error: true } },
      _count: { select: { comments: true } },
    },
  });

  const thumbnailUrlByPath = await getThumbnailUrlByPath(
    videos.flatMap((video) => video.thumbnailPath ?? []),
  );

  const stats = [
    `${players.length} player${players.length === 1 ? "" : "s"}`,
    `${videos.length} in queue`,
  ];

  return (
    <PageShell>
      <div className="grid gap-8">
        <div className="-mx-6 bg-cream-100/80 px-6 py-6 sm:-mx-12 sm:rounded-[12px] sm:px-12">
          <StatusBoard
            kicker="COACH HOME"
            stats={stats}
            title={profile.coach.name}
          />
        </div>
        <div className="grid gap-3">
          <Kicker>Review queue</Kicker>
          <p className="text-[14.5px] text-ink-600">
            New videos from players you are connected with. Open a video to mark it as
            reviewed.
          </p>
        </div>
        <div className="grid gap-5">
          <CoachPlayers players={players} />
          <VideoFilterBar />
          <VideoGrid
            emptyMessage="No unviewed videos. Visit a player from the Players panel to rewatch their videos."
            linkBase="/dashboard/coach/videos"
            videos={videos.map(({ _count, report, ...video }) => ({
              ...video,
              commentCount: _count.comments,
              playerName: video.player.name,
              reportStatus: effectiveReportStatus(report),
              tagLabel: formatVideoTags(video.category, video.variation, video.handedness),
              thumbnailUrl: video.thumbnailPath
                ? (thumbnailUrlByPath.get(video.thumbnailPath) ?? null)
                : null,
            }))}
          />
        </div>
      </div>
    </PageShell>
  );
}

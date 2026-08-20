import { redirect } from "next/navigation";
import { CoachStatus, PlayerVideoStatus } from "@/app/generated/prisma/enums";
import { CoachPlayers } from "@/components/coach-players";
import { GatePanel, PageHeader, PageShell, SectionHeading, TextLink } from "@/components/ui";
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
      <main className="mx-auto w-full max-w-[1360px] px-6 pt-14 pb-16 sm:px-10" id="main-content">
        <GatePanel
          description={
            rejected
              ? "We couldn't verify your coaching background from what was submitted. If you think that's wrong, write to us with your club, role and certifications and we'll take another look."
              : "An administrator reviews every coach account to keep the platform safe for young athletes. We'll email you the moment yours is approved — usually within a day or two."
          }
          kicker={rejected ? undefined : "Under review"}
          title={
            rejected
              ? "This account wasn't approved"
              : `Welcome, ${profile.coach.name.split(" ")[0] || profile.coach.name}`
          }
        >
          {rejected ? (
            <p className="mt-6 text-ui">
              <TextLink href="/contact">Email NextXI →</TextLink>
            </p>
          ) : (
            <div className="mt-7 flex items-center gap-3 rounded-lg border border-cream-400 bg-cream-100 px-4 py-3.5">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-amber-500" />
              <p className="text-ui text-ink-800">Nothing else for you to do.</p>
            </div>
          )}
        </GatePanel>
      </main>
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
      <PageHeader
        action={
          <p className="text-ui text-ink-600">Opening a video marks it reviewed.</p>
        }
        subtitle={stats.join(" · ")}
        title={profile.coach.name}
      />
      <div className="mt-8 grid gap-7">
        <CoachPlayers players={players} />
        <VideoFilterBar unviewedCount={videos.length} />
        <div>
          <SectionHeading>Review queue</SectionHeading>
          <div className="mt-4">
            <VideoGrid
              className="grid-cols-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1"
              emptyMessage="No unviewed videos. Visit a player from Your players above to rewatch their videos."
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
      </div>
    </PageShell>
  );
}

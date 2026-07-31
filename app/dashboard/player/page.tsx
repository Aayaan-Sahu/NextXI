import { redirect } from "next/navigation";
import { deleteVideo } from "@/app/dashboard/player/videos/actions";
import { PlayerStatus } from "@/app/generated/prisma/enums";
import { CoachFeedback } from "@/components/coach-feedback";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import {
  Badge,
  GatePanel,
  Kicker,
  PageShell,
  StatusBoard,
} from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { VideoUpload } from "@/components/video-upload";
import { getProfile, requireUser } from "@/lib/auth";
import { formatGuardianCode } from "@/lib/guardian-code";
import { PLAYER_ROLE_LABELS } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import { getReadyVideoGridItems } from "@/lib/videos.server";

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function PlayerDashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "player") redirect(`/dashboard/${profile.role}`);

  if (profile.player.status === PlayerStatus.PENDING_GUARDIAN) {
    return (
      <PageShell>
        <div className="-mx-6 mb-2 bg-cream-100/80 px-6 py-6 sm:-mx-12 sm:rounded-[12px] sm:px-12">
          <GatePanel
            code={formatGuardianCode(profile.player.guardianCode ?? "")}
            description={
              <p>
                Because you&apos;re under 18, a parent or guardian needs to approve
                your account before you can use the platform. Ask them to sign up,
                choose &ldquo;I&apos;m a parent / guardian&rdquo;, and enter this
                code.
              </p>
            }
            kicker="AWAITING GUARDIAN"
            title={`Welcome ${profile.player.name}`}
          />
        </div>
      </PageShell>
    );
  }

  // Latest coach comments across the player's videos, so feedback isn't only
  // discoverable by reopening each video. Comments are coach-authored only.
  const [videos, feedback] = await Promise.all([
    getReadyVideoGridItems(user.id),
    prisma.videoComment.findMany({
      where: { video: { playerId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        authorName: true,
        authorUsername: true,
        body: true,
        createdAt: true,
        videoId: true,
        video: { select: { originalFilename: true } },
      },
    }),
  ]);

  const latestUpload = videos[0]
    ? formatShortDate(videos[0].uploadedAt ?? videos[0].createdAt)
    : null;
  const stats = [
    `${videos.length} video${videos.length === 1 ? "" : "s"}`,
    latestUpload ? `Latest ${latestUpload}` : "No uploads yet",
    `${feedback.length} recent note${feedback.length === 1 ? "" : "s"}`,
  ];

  return (
    <PageShell>
      <DashboardReveal className="grid gap-9">
        <DashboardRevealItem index={0}>
          <div className="-mx-6 bg-cream-100/80 px-6 py-6 sm:-mx-12 sm:rounded-[12px] sm:px-12">
            <StatusBoard
              actions={
                profile.player.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.player.roles.map((role) => (
                      <Badge key={role}>{PLAYER_ROLE_LABELS[role]}</Badge>
                    ))}
                  </div>
                ) : undefined
              }
              kicker="PLAYER HOME"
              stats={stats}
              title={profile.player.name}
            />
          </div>
        </DashboardRevealItem>

        <DashboardRevealItem className="grid gap-3" index={1}>
          <Kicker>Footage</Kicker>
          <VideoUpload />
        </DashboardRevealItem>

        <DashboardRevealItem index={2}>
          <CoachFeedback
            items={feedback.map((comment) => ({
              id: comment.id,
              authorName: comment.authorName,
              authorUsername: comment.authorUsername,
              body: comment.body,
              createdAt: comment.createdAt,
              videoId: comment.videoId,
              videoFilename: comment.video.originalFilename,
            }))}
          />
        </DashboardRevealItem>

        <DashboardRevealItem className="grid gap-3" index={3}>
          <Kicker>Library</Kicker>
          <VideoGrid deleteAction={deleteVideo} videos={videos} />
        </DashboardRevealItem>
      </DashboardReveal>
    </PageShell>
  );
}

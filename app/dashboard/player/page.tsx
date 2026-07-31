import { redirect } from "next/navigation";
import { deleteVideo } from "@/app/dashboard/player/videos/actions";
import {
  PlayerStatus,
  PlayerVideoStatus,
  ReportStatus,
  Visibility,
} from "@/app/generated/prisma/enums";
import { CoachFeedback } from "@/components/coach-feedback";
import { LatestReportCard } from "@/components/latest-report-card";
import { ReportAutoRefresh } from "@/components/report-auto-refresh";
import {
  DashboardReveal,
  DashboardRevealItem,
} from "@/components/dashboard-reveal";
import {
  Badge,
  GatePanel,
  Kicker,
  PageShell,
  Panel,
  StatusBand,
  StatusBoard,
  TextLink,
} from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { VideoUpload } from "@/components/video-upload";
import { getProfile, requireUser } from "@/lib/auth";
import { formatGuardianCode } from "@/lib/guardian-code";
import { PLAYER_ROLE_LABELS } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import { formatVideoTags } from "@/lib/videos";
import {
  getPlayerVideoPulse,
  getReadyVideoGridItems,
  londonDayNumber,
} from "@/lib/videos.server";

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** London clock, not the server's — the player base is UK cricket. */
function timeOfDayGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/London",
    }).format(new Date()),
  );
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 18) return "Afternoon";
  return "Evening";
}

/**
 * One human sentence on upload recency. Numeral-free on purpose — exact
 * machine facts live in the mono stats line, per the Lower-Third Rule.
 */
function uploadNudge(latest: Date | null) {
  if (!latest) return "No uploads yet — your first clip gets your first coaching report.";
  const days = londonDayNumber(new Date()) - londonDayNumber(latest);
  if (days <= 1) return "Fresh footage just in — nice work keeping it regular.";
  if (days <= 7) return "Fresh footage this week — nice work keeping the rhythm.";
  return "It's been a while since your last upload — the next report is one clip away.";
}

export default async function PlayerDashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "player") redirect(`/dashboard/${profile.role}`);

  if (profile.player.status === PlayerStatus.PENDING_GUARDIAN) {
    return (
      <PageShell>
        <StatusBand className="mb-2">
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
        </StatusBand>
      </PageShell>
    );
  }

  // Latest coach comments across the player's videos, so feedback isn't only
  // discoverable by reopening each video. Comments are coach-authored only.
  const [videos, pulse, feedback, latestReport, guardianRow] = await Promise.all([
    getReadyVideoGridItems(user.id),
    getPlayerVideoPulse(user.id),
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
    // Newest READY report across all videos (session-filed ones included —
    // the grid excludes those, but the video detail page renders them fine).
    prisma.report.findFirst({
      where: {
        status: ReportStatus.READY,
        video: { playerId: user.id, status: PlayerVideoStatus.READY },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        payload: true,
        updatedAt: true,
        video: {
          select: { id: true, category: true, variation: true, handedness: true },
        },
      },
    }),
    prisma.player.findUnique({
      where: { id: user.id },
      select: { guardian: { select: { name: true } } },
    }),
  ]);
  const guardianName = guardianRow?.guardian?.name ?? null;

  // Header numbers come from the account-wide pulse (sessions included), so
  // they always agree with the latest-report card; the grid below is
  // standalone-only by design.
  const latestUpload = pulse.latestUploadAt ? formatShortDate(pulse.latestUploadAt) : null;
  const firstName = profile.player.name.split(" ")[0] || profile.player.name;
  const stats = [
    `${pulse.totalVideos} video${pulse.totalVideos === 1 ? "" : "s"}`,
    `${pulse.reportsReady} report${pulse.reportsReady === 1 ? "" : "s"} ready`,
    latestUpload ? `Latest ${latestUpload}` : "No uploads yet",
    `${feedback.length} recent note${feedback.length === 1 ? "" : "s"}`,
    ...(pulse.streakWeeks >= 2 ? [`${pulse.streakWeeks}-week upload streak`] : []),
  ];
  const revealBase = latestReport ? 2 : 1;

  return (
    <PageShell>
      {pulse.analysing ? <ReportAutoRefresh /> : null}
      <DashboardReveal className="grid gap-9">
        <DashboardRevealItem index={0}>
          <StatusBand>
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
              note={uploadNudge(pulse.latestUploadAt)}
              stats={stats}
              title={`${timeOfDayGreeting()}, ${firstName}.`}
            />
          </StatusBand>
        </DashboardRevealItem>

        {latestReport ? (
          <DashboardRevealItem index={1}>
            <LatestReportCard
              href={`/dashboard/player/videos/${latestReport.video.id}`}
              payload={latestReport.payload}
              tagLabel={formatVideoTags(
                latestReport.video.category,
                latestReport.video.variation,
                latestReport.video.handedness,
              )}
              updatedAt={latestReport.updatedAt}
            />
          </DashboardRevealItem>
        ) : null}

        <DashboardRevealItem className="grid gap-3" index={revealBase}>
          <Kicker>Footage</Kicker>
          <VideoUpload />
        </DashboardRevealItem>

        <DashboardRevealItem index={revealBase + 1}>
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

        <DashboardRevealItem className="grid gap-3" index={revealBase + 2}>
          <Kicker>Library</Kicker>
          <VideoGrid deleteAction={deleteVideo} emptyMedia videos={videos} />
        </DashboardRevealItem>

        <DashboardRevealItem index={revealBase + 3}>
          <Panel>
            <Kicker>Profile visibility</Kicker>
            <div className="mt-4 grid gap-1.5 text-sm">
              <p className="text-ink-900">
                {profile.player.visibility === Visibility.PUBLIC
                  ? "Public — any approved coach can find you in the player directory and view your profile, videos, and coaching reports without connecting."
                  : "Private — only coaches you've connected with can see your profile."}
              </p>
              <p className="text-ink-600">
                {guardianName
                  ? `Guardian linked: ${guardianName}.`
                  : "No guardian linked to this account."}
              </p>
            </div>
            <div className="mt-4">
              <TextLink href="/dashboard/profile">Manage visibility</TextLink>
            </div>
          </Panel>
        </DashboardRevealItem>
      </DashboardReveal>
    </PageShell>
  );
}

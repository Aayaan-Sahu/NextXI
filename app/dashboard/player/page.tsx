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
  Chip,
  GatePanel,
  PageShell,
  SectionHead,
  TextLink, PageTitle } from "@/components/ui";
import { VideoGrid } from "@/components/video-grid";
import { VideoUpload } from "@/components/video-upload";
import { getProfile, requireUser } from "@/lib/auth";
import { GuardianHandoff } from "@/components/guardian-handoff";
import { formatGuardianCode } from "@/lib/guardian-code";
import { PLAYER_ROLE_LABELS } from "@/lib/players";
import { prisma } from "@/lib/prisma";
import { formatVideoTags } from "@/lib/videos";
import { getPlayerVideoPulse, getReadyVideoGridItems } from "@/lib/videos.server";

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

export default async function PlayerDashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.role) redirect("/onboarding");
  if (profile.role !== "player") redirect(`/dashboard/${profile.role}`);

  if (profile.player.status === PlayerStatus.PENDING_GUARDIAN) {
    return (
      <main className="mx-auto w-full max-w-[1360px] px-6 pt-16 pb-20 sm:px-10" id="main-content">
        <GatePanel
          code={formatGuardianCode(profile.player.guardianCode ?? "")}
          description="A parent or guardian has to approve your account before you can upload. Give them this code."
          kicker="Awaiting guardian"
          title={`Welcome, ${profile.player.name.split(" ")[0] || profile.player.name}`}
        >
          {profile.player.guardianCode ? (
            <GuardianHandoff
              code={formatGuardianCode(profile.player.guardianCode)}
              playerName={profile.player.name}
            />
          ) : null}
          <ol className="mt-8 grid gap-2.5 border-t border-cream-400 pt-6 text-left text-ui leading-relaxed text-ink-800">
            <li className="flex gap-3">
              <span className="font-semibold text-ink-600">1</span>
              <span>Your parent signs up at nextxi.pro/auth with their own email.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-ink-600">2</span>
              <span>
                On the profile step they choose{" "}
                <span className="font-semibold">I&apos;m a parent or guardian</span>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-ink-600">3</span>
              <span>They enter the code above. Your account opens straight away.</span>
            </li>
          </ol>
        </GatePanel>
      </main>
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
          select: {
            id: true,
            category: true,
            handedness: true,
            originalFilename: true,
            variation: true,
          },
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
      <DashboardReveal className="grid gap-6">
        <DashboardRevealItem index={0}>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <PageTitle>{timeOfDayGreeting()}, {firstName}</PageTitle>
              <p className="mt-1.5 text-ui text-ink-600">{stats.join(" · ")}</p>
            </div>
            {profile.player.roles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.player.roles.map((role) => (
                  <Chip key={role}>{PLAYER_ROLE_LABELS[role]}</Chip>
                ))}
              </div>
            ) : null}
          </div>
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
              title={latestReport.video.originalFilename}
              updatedAt={latestReport.updatedAt}
            />
          </DashboardRevealItem>
        ) : null}

        <DashboardRevealItem index={revealBase}>
          <VideoUpload />
        </DashboardRevealItem>

        <DashboardRevealItem
          className="mt-4 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]"
          index={revealBase + 1}
        >
          <section>
            <SectionHead
              aside={
                <TextLink className="text-ui" href="/dashboard/player/sessions">
                  All {pulse.totalVideos} →
                </TextLink>
              }
            >
              Your clips
            </SectionHead>
            <div className="mt-4">
              <VideoGrid deleteAction={deleteVideo} stagger={false} videos={videos} />
            </div>
          </section>

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

        <DashboardRevealItem className="mt-2" index={revealBase + 2}>
          <p className="text-caption text-ink-600">
            Profile is{" "}
            {profile.player.visibility === Visibility.PUBLIC ? "public" : "private"}
            {guardianName ? ` · guardian ${guardianName}` : ""} ·{" "}
            <TextLink className="text-caption" href="/dashboard/profile">
              Edit profile
            </TextLink>
          </p>
        </DashboardRevealItem>
      </DashboardReveal>
    </PageShell>
  );
}

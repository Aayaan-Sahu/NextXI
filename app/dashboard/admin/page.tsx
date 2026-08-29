import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { signOut } from "@/app/auth/actions";
import { ClubStatus, CoachStatus, ReportReviewStatus, ReportStatus } from "@/app/generated/prisma/enums";
import { Notice, SectionHeading, Wordmark } from "@/components/ui";
import { getOnboardingStatus, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/search-params";
import { isVideoDiscipline, VIDEO_DISCIPLINES } from "@/lib/videos";
import {
  approveClub,
  approveCoach,
  previewCoach,
  rejectClub,
  rejectCoach,
  releaseHeldReport,
  rerunHeldReport,
} from "./actions";

type SearchParams = Promise<{
  error?: string | string[];
  message?: string | string[];
}>;

const QUEUE_COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_70px_84px_50px] gap-3 max-sm:grid-cols-1 max-sm:gap-1";

/** Compact age for queue rows, e.g. "4m", "2h", "3d". */
function formatAge(from: Date, now: Date) {
  const minutes = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdmin();
  // Most administrators are only that. One who also signed up as a player or
  // a coach keeps that account, and needs the door back to it.
  const { role } = await getOnboardingStatus(user.id);

  const [pendingCoaches, pendingClubs, approvedCoaches] = await Promise.all([
    prisma.coach.findMany({
      where: { status: CoachStatus.PENDING },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, accomplishments: true, createdAt: true },
    }),
    prisma.club.findMany({
      where: { status: ClubStatus.PENDING },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, country: true, bio: true, createdAt: true },
    }),
    prisma.coach.findMany({
      where: { status: CoachStatus.APPROVED },
      orderBy: { name: "asc" },
      select: { id: true, name: true, club: true },
    }),
  ]);
  // Reports the AI worker still owes us, plus the ones a coach has held —
  // the ops queue for the pilot.
  const queuedReports = await prisma.report.findMany({
    where: {
      OR: [
        { status: { in: [ReportStatus.PENDING, ReportStatus.PROCESSING, ReportStatus.FAILED] } },
        { status: ReportStatus.READY, reviewStatus: ReportReviewStatus.HELD },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      videoId: true,
      status: true,
      reviewStatus: true,
      holdReason: true,
      reviewedByName: true,
      attempts: true,
      claimedAt: true,
      createdAt: true,
      video: {
        select: {
          category: true,
          createdAt: true,
          playerId: true,
          player: { select: { name: true } },
        },
      },
    },
  });

  const profiles = await prisma.profile.findMany({
    where: {
      id: {
        in: [
          ...pendingCoaches.map((coach) => coach.id),
          ...pendingClubs.map((club) => club.id),
          ...queuedReports.map((report) => report.video.playerId),
        ],
      },
    },
    select: { id: true, username: true },
  });
  const usernames = new Map(profiles.map((profile) => [profile.id, profile.username]));
  const now = new Date();

  const params = await searchParams;
  const error = firstParam(params.error);
  const message = firstParam(params.message);

  const claimedNote = queuedReports.find((report) => report.claimedAt);

  return (
    <>
      <header className="bg-pitch-900">
        <div className="mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between px-6 sm:px-10">
          <div className="flex items-center gap-5">
            <Wordmark tone="dark" />
            <span aria-hidden className="h-5 w-px bg-cream-200/25" />
            <span className="text-ui text-cream-200">Admin — coach review</span>
          </div>
          <div className="flex items-center gap-4 text-caption text-cream-200/[.66]">
            <span className="max-sm:hidden">{user.email}</span>
            {role ? (
              <Link
                className="font-semibold text-cream-200 no-underline hover:text-cream-50"
                href={`/dashboard/${role}`}
              >
                Your dashboard
              </Link>
            ) : null}
            <form action={signOut}>
              <button
                className="cursor-pointer font-semibold text-gold-500 hover:text-gold-600"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1360px] px-6 pt-7 pb-14 sm:px-10" id="main-content">
        <h1 className="sr-only">Admin — coach review</h1>
        <div className="grid gap-2.5 empty:hidden">
          <Notice tone="error">{error}</Notice>
          <Notice>{message}</Notice>
        </div>

        <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_480px]">
          <section>
            <SectionHeading>Pending coaches · {pendingCoaches.length}</SectionHeading>
            <p className="mt-1.5 text-caption text-ink-600">
              Oldest first. Rejection is final in this console.
            </p>
            {pendingCoaches.length ? (
              <ul className="mt-4 border-b border-cream-400">
                {pendingCoaches.map((coach) => (
                  <li
                    className="flex items-start justify-between gap-5 border-t border-cream-400 py-[18px] max-sm:flex-col"
                    key={coach.id}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold">
                        {coach.name}
                        {usernames.get(coach.id) ? (
                          <span className="font-normal text-ink-600">
                            {" "}
                            @{usernames.get(coach.id)}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-[3px] text-caption text-ink-600">
                        Submitted{" "}
                        {coach.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      {coach.accomplishments.length ? (
                        <ul className="mt-2.5 grid gap-[5px] text-ui text-ink-800">
                          {coach.accomplishments.map((item) => (
                            <li className="flex gap-2.5" key={item}>
                              <span aria-hidden className="text-ink-600">
                                ·
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2.5 text-ui text-ink-600">
                          No accomplishments listed.
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <form action={approveCoach}>
                        <input name="coachId" type="hidden" value={coach.id} />
                        <SubmitButton className="!px-5 !py-[9px] !text-ui">
                          Approve
                        </SubmitButton>
                      </form>
                      <form action={rejectCoach}>
                        <input name="coachId" type="hidden" value={coach.id} />
                        <button
                          className="cursor-pointer rounded-md border border-rust-300 bg-transparent px-5 py-[9px] text-ui font-semibold text-rust-600 hover:bg-rust-50"
                          type="submit"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-ui text-ink-600">No coaches awaiting review.</p>
            )}

            <div className="mt-10">
              <SectionHeading>Pending clubs · {pendingClubs.length}</SectionHeading>
              <p className="mt-1.5 text-caption text-ink-600">
                A club reaches no player until it is verified. Its coaches are approved separately.
              </p>
              {pendingClubs.length ? (
                <ul className="mt-4 border-b border-cream-400">
                  {pendingClubs.map((club) => (
                    <li
                      className="flex items-start justify-between gap-5 border-t border-cream-400 py-[18px] max-sm:flex-col"
                      key={club.id}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-body font-semibold">
                          {club.name}
                          {usernames.get(club.id) ? (
                            <span className="font-normal text-ink-600">
                              {" "}
                              @{usernames.get(club.id)}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-[3px] text-caption text-ink-600">
                          {club.country} · Submitted{" "}
                          {club.createdAt.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                        <p className="mt-2.5 text-ui text-ink-800">
                          {club.bio || "No description given."}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <form action={approveClub}>
                          <input name="clubId" type="hidden" value={club.id} />
                          <SubmitButton className="!px-5 !py-[9px] !text-ui">Approve</SubmitButton>
                        </form>
                        <form action={rejectClub}>
                          <input name="clubId" type="hidden" value={club.id} />
                          <button
                            className="cursor-pointer rounded-md border border-rust-300 bg-transparent px-5 py-[9px] text-ui font-semibold text-rust-600 hover:bg-rust-50"
                            type="submit"
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-ui text-ink-600">No clubs awaiting review.</p>
              )}
            </div>
          </section>

          <section>
            <SectionHeading>Report queue · {queuedReports.length}</SectionHeading>
            <p className="mt-1.5 text-caption text-ink-600">
              Pipeline telemetry. A report a coach has held can be released to the player or run
              again.
            </p>
            {queuedReports.length ? (
              <div className="mt-4">
                <div className={`${QUEUE_COLUMNS} pb-2 text-caption text-ink-600 max-sm:hidden`}>
                  <span>Player · discipline</span>
                  <span>Age</span>
                  <span>Status</span>
                  <span>Tries</span>
                </div>
                <ul className="border-b border-cream-400">
                  {queuedReports.map((report) => (
                    <li
                      className={`${QUEUE_COLUMNS} items-baseline border-t border-cream-400 py-3 text-ui`}
                      key={report.id}
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-semibold">{report.video.player.name}</span>{" "}
                        <span className="text-ink-600">
                          {usernames.get(report.video.playerId)
                            ? `@${usernames.get(report.video.playerId)} · `
                            : ""}
                          {isVideoDiscipline(report.video.category)
                            ? VIDEO_DISCIPLINES[report.video.category].label
                            : "Untagged"}
                        </span>
                      </span>
                      <span className="text-ink-600 tabular-nums">
                        {formatAge(report.video.createdAt, now)}
                      </span>
                      <span
                        className={
                          report.status === ReportStatus.FAILED ||
                          report.reviewStatus === ReportReviewStatus.HELD
                            ? "font-semibold text-rust-600"
                            : undefined
                        }
                      >
                        {report.reviewStatus === ReportReviewStatus.HELD
                          ? "held"
                          : report.status.toLowerCase()}
                      </span>
                      <span className="tabular-nums">{report.attempts}</span>
                      {report.reviewStatus === ReportReviewStatus.HELD ? (
                        <div className="col-span-full flex flex-wrap items-center justify-between gap-3 pt-1">
                          <p className="min-w-0 text-caption text-ink-800">
                            {report.reviewedByName ? `Held by ${report.reviewedByName}: ` : "Held: "}
                            {report.holdReason}
                          </p>
                          <div className="flex shrink-0 gap-2">
                            <form action={releaseHeldReport}>
                              <input name="videoId" type="hidden" value={report.videoId} />
                              <SubmitButton className="!px-4 !py-[7px] !text-caption">
                                Release to player
                              </SubmitButton>
                            </form>
                            <form action={rerunHeldReport}>
                              <input name="videoId" type="hidden" value={report.videoId} />
                              <SubmitButton
                                className="!px-4 !py-[7px] !text-caption"
                                variant="secondary"
                              >
                                Re-run analysis
                              </SubmitButton>
                            </form>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {claimedNote?.claimedAt ? (
                  <p className="mt-3 text-caption text-ink-600">
                    {claimedNote.video.player.name}&apos;s report was claimed by a worker{" "}
                    {formatAge(claimedNote.claimedAt, now)} ago.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-ui text-ink-600">
                No reports waiting on the pipeline.
              </p>
            )}
          </section>

          <section>
            <SectionHeading>Coach dashboards · {approvedCoaches.length}</SectionHeading>
            <p className="mt-1.5 text-caption text-ink-600">
              Open one to read the approval queue and the review screen the way that coach sees
              them. Reading only: sign-off, feedback and marking a clip seen all authorise against
              your own account, which is not theirs.
            </p>
            {approvedCoaches.length ? (
              <ul className="mt-3.5 border-b border-cream-400">
                {approvedCoaches.map((coach) => (
                  <li
                    className="flex items-center justify-between gap-5 border-t border-cream-400 py-3"
                    key={coach.id}
                  >
                    <div className="min-w-0">
                      <p className="text-ui font-semibold text-ink-900">{coach.name}</p>
                      {coach.club ? (
                        <p className="mt-0.5 text-caption text-ink-600">{coach.club}</p>
                      ) : null}
                    </div>
                    <form action={previewCoach}>
                      <input name="coachId" type="hidden" value={coach.id} />
                      <SubmitButton className="!px-4 !py-[7px] !text-caption" variant="secondary">
                        Open their dashboard
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-ui text-ink-600">No approved coaches yet.</p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

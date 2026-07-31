import { SubmitButton } from "@/components/submit-button";
import { signOut } from "@/app/auth/actions";
import { CoachStatus, ReportStatus } from "@/app/generated/prisma/enums";
import { Notice, Panel, Wordmark } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/search-params";
import { isVideoDiscipline, VIDEO_DISCIPLINES } from "@/lib/videos";
import { approveCoach, rejectCoach } from "./actions";

type SearchParams = Promise<{
  error?: string | string[];
  message?: string | string[];
}>;

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

  const pendingCoaches = await prisma.coach.findMany({
    where: { status: CoachStatus.PENDING },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, accomplishments: true, createdAt: true },
  });
  // Reports the AI worker still owes us — the ops queue for the pilot.
  const queuedReports = await prisma.report.findMany({
    where: {
      status: {
        in: [ReportStatus.PENDING, ReportStatus.PROCESSING, ReportStatus.FAILED],
      },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
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

  return (
    <>
      <header className="flex h-16 items-center justify-between bg-pitch-900 px-6 sm:px-10">
        <Wordmark tone="dark" />
        <form action={signOut}>
          <button
            className="cursor-pointer rounded-md border border-cream-200/30 bg-transparent px-4 py-2 text-[13px] font-semibold text-cream-200 hover:bg-cream-200/10"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-[820px] px-6 py-11 sm:px-8">
        <h1 className="font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] uppercase">
          Admin — coach review
        </h1>
        <p className="mt-2 font-mono text-[12.5px] text-ink-600">{user.email}</p>
        <Notice tone="error">{error}</Notice>
        <Notice>{message}</Notice>

        <div className="mt-7">
          <Panel>
            <h2 className="font-display text-xl leading-tight font-semibold uppercase">
              Pending coaches{" "}
              <span className="font-mono text-[15px] font-medium text-rust-600">
                ({pendingCoaches.length})
              </span>
            </h2>
            {pendingCoaches.length ? (
              <ul className="mt-4">
                {pendingCoaches.map((coach) => (
                  <li
                    className="flex justify-between gap-5 border-t border-cream-400 py-5 max-sm:flex-col"
                    key={coach.id}
                  >
                    <div>
                      <p className="text-[15px] font-bold">
                        {coach.name}
                        {usernames.get(coach.id) ? (
                          <span className="font-mono text-xs font-medium text-ink-600">
                            {" "}
                            @{usernames.get(coach.id)}
                          </span>
                        ) : null}
                      </p>
                      {coach.accomplishments.length ? (
                        <ul className="mt-2 list-disc pl-[18px] text-[13.5px] leading-[1.7] text-ink-600">
                          {coach.accomplishments.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-[13.5px] text-sage-400">
                          No accomplishments listed.
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2.5 self-start">
                      <form action={approveCoach}>
                        <input name="coachId" type="hidden" value={coach.id} />
                        <SubmitButton>Approve</SubmitButton>
                      </form>
                      <form action={rejectCoach}>
                        <input name="coachId" type="hidden" value={coach.id} />
                        <button
                          className="cursor-pointer rounded-md border border-cream-500 bg-transparent px-4 py-2.5 text-sm font-semibold text-rust-600 hover:bg-cream-100"
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
              <p className="mt-4 text-sm text-ink-600">No coaches awaiting review.</p>
            )}
          </Panel>
        </div>

        <div className="mt-7">
          <Panel>
            <h2 className="font-display text-xl leading-tight font-semibold uppercase">
              Report queue{" "}
              <span className="font-mono text-[15px] font-medium text-rust-600">
                ({queuedReports.length})
              </span>
            </h2>
            {queuedReports.length ? (
              <ul className="mt-4">
                {queuedReports.map((report) => (
                  <li
                    className="flex justify-between gap-5 border-t border-cream-400 py-5 max-sm:flex-col"
                    key={report.id}
                  >
                    <div>
                      <p className="text-[15px] font-bold">
                        {report.video.player.name}
                        {usernames.get(report.video.playerId) ? (
                          <span className="font-mono text-xs font-medium text-ink-600">
                            {" "}
                            @{usernames.get(report.video.playerId)}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-2 font-mono text-xs text-ink-600">
                        {isVideoDiscipline(report.video.category)
                          ? VIDEO_DISCIPLINES[report.video.category].label
                          : "Untagged"}{" "}
                        · uploaded {formatAge(report.video.createdAt, now)} ago
                      </p>
                    </div>
                    <p className="self-start font-mono text-xs text-ink-600 sm:text-right">
                      <span
                        className={
                          report.status === ReportStatus.FAILED
                            ? "font-semibold text-rust-600"
                            : "font-semibold text-ink-900"
                        }
                      >
                        {report.status.toLowerCase()}
                      </span>{" "}
                      · {report.attempts}{" "}
                      {report.attempts === 1 ? "attempt" : "attempts"}
                      {report.claimedAt
                        ? ` · claimed ${formatAge(report.claimedAt, now)} ago`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-600">No reports waiting on the pipeline.</p>
            )}
          </Panel>
        </div>
      </main>
    </>
  );
}

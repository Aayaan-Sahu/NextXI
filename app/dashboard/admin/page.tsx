import { signOut } from "@/app/auth/actions";
import { CoachStatus } from "@/app/generated/prisma/enums";
import { Notice, Panel, PrimaryButton, Wordmark } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { firstParam } from "@/lib/search-params";
import { approveCoach, rejectCoach } from "./actions";

type SearchParams = Promise<{
  error?: string | string[];
  message?: string | string[];
}>;

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
  const profiles = await prisma.profile.findMany({
    where: { id: { in: pendingCoaches.map((coach) => coach.id) } },
    select: { id: true, username: true },
  });
  const usernames = new Map(profiles.map((profile) => [profile.id, profile.username]));

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
                        <PrimaryButton type="submit">Approve</PrimaryButton>
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
      </main>
    </>
  );
}

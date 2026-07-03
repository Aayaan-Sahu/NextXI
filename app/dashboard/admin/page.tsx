import { CoachStatus } from "@/app/generated/prisma/enums";
import {
  Notice,
  PageHeader,
  PageShell,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SignOutButton,
} from "@/components/ui";
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
    <PageShell>
      <PageHeader
        action={<SignOutButton />}
        subtitle={user.email}
        title="Admin — coach review"
      />
      <Notice tone="error">{error}</Notice>
      <Notice>{message}</Notice>

      <Panel title={`Pending coaches (${pendingCoaches.length})`}>
        {pendingCoaches.length ? (
          <ul className="grid gap-5">
            {pendingCoaches.map((coach) => (
              <li
                className="grid gap-3 border-t border-stone-300 pt-4 first:border-t-0 first:pt-0 dark:border-neutral-700"
                key={coach.id}
              >
                <div>
                  <p className="font-semibold">
                    {coach.name}
                    {usernames.get(coach.id) ? (
                      <span className="font-normal text-stone-600 dark:text-neutral-300">
                        {" "}
                        @{usernames.get(coach.id)}
                      </span>
                    ) : null}
                  </p>
                  {coach.accomplishments.length ? (
                    <ul className="mt-2 list-disc pl-[18px] text-sm">
                      {coach.accomplishments.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-stone-600 dark:text-neutral-300">
                      No accomplishments listed.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <form action={approveCoach}>
                    <input name="coachId" type="hidden" value={coach.id} />
                    <PrimaryButton type="submit">Approve</PrimaryButton>
                  </form>
                  <form action={rejectCoach}>
                    <input name="coachId" type="hidden" value={coach.id} />
                    <SecondaryButton type="submit">Reject</SecondaryButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-600 dark:text-neutral-300">
            No coaches awaiting review.
          </p>
        )}
      </Panel>
    </PageShell>
  );
}

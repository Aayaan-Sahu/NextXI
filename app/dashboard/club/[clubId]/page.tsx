import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import { ClubCoachRole, ClubStatus } from "@/app/generated/prisma/enums";
import { ClubClaim } from "@/components/club-claim";
import { ClubCoaches } from "@/components/club-coaches";
import { ClubRoster } from "@/components/club-roster";
import { GatePanel, Notice, PageHeader, PageShell, SectionHeading, TextLink } from "@/components/ui";
import { isAdmin, requireUser } from "@/lib/auth";
import {
  getClaimablePlayers,
  getClubAccess,
  getClubCoaches,
  getClubRoster,
} from "@/lib/clubs.server";
import { countryWithFlag } from "@/lib/players";
import { firstParam } from "@/lib/search-params";

type SearchParams = Promise<{
  clubError?: string | string[];
  clubMessage?: string | string[];
}>;

/**
 * A club's dashboard, opened either by the club's own account or by a coach
 * who runs it. What it shows is deliberately narrow: who is in the club, who
 * could be, and who can act for it. A club watches its players' clips and
 * reads their signed-off reports — it never signs one off. That stays a
 * person's name on a person's judgement (lib/report-review.ts).
 */
export default async function ClubPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireUser();

  if (isAdmin(user)) redirect("/dashboard/admin");

  const [{ clubId }, query] = await Promise.all([params, searchParams]);

  if (!isUuid(clubId)) notFound();

  const access = await getClubAccess(user.id, clubId);
  if (!access) notFound();

  const { club, viewer, role } = access;

  if (club.status !== ClubStatus.APPROVED) {
    const rejected = club.status === ClubStatus.REJECTED;

    // A coach shouldn't be able to reach an unapproved club at all, but if one
    // does, they get the same gate rather than a half-built dashboard.
    return (
      <main className="mx-auto w-full max-w-[1360px] px-6 pt-14 pb-16 sm:px-10" id="main-content">
        <GatePanel
          description={
            rejected
              ? "We couldn't verify this club from what was submitted. If you think that's wrong, write to us with the club's ground, age groups and the coaches who run it."
              : "An administrator verifies every club before it can reach a player. We'll email you the moment yours is approved — usually within a day or two."
          }
          kicker={rejected ? undefined : "Under review"}
          title={rejected ? "This club wasn't approved" : club.name}
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

  const [claimable, roster, coaches] = await Promise.all([
    getClaimablePlayers(clubId),
    getClubRoster(clubId),
    getClubCoaches(clubId),
  ]);

  const canManage = viewer === "club" || role === ClubCoachRole.OWNER;
  const stats = [
    countryWithFlag(club.country),
    `${roster.length} ${roster.length === 1 ? "player" : "players"}`,
    `${coaches.length} ${coaches.length === 1 ? "coach" : "coaches"}`,
  ].join(" · ");

  return (
    <PageShell>
      <PageHeader
        action={
          viewer === "coach" ? (
            <p className="text-ui text-ink-600">
              You&apos;re here as a coach of {club.name}, signed in as yourself.
            </p>
          ) : null
        }
        subtitle={stats}
        title={club.name}
      />

      <Notice tone="error">{firstParam(query.clubError)}</Notice>
      <Notice>{firstParam(query.clubMessage)}</Notice>

      <div className="mt-8 grid gap-9">
        {claimable.length ? (
          <section>
            <SectionHeading>Players who list this club · {claimable.length}</SectionHeading>
            <p className="mt-1.5 text-caption text-ink-600">
              They typed {club.name} when they signed up and their profile is public. Asking
              sends each of them a request — they decide.
            </p>
            <div className="mt-3.5">
              <ClubClaim clubId={clubId} players={claimable} />
            </div>
          </section>
        ) : null}

        <section>
          <SectionHeading>Players</SectionHeading>
          <div className="mt-3.5">
            <ClubRoster clubId={clubId} players={roster} />
          </div>
        </section>

        <section>
          <SectionHeading>Coaches</SectionHeading>
          <div className="mt-3.5">
            <ClubCoaches canManage={canManage} clubId={clubId} coaches={coaches} />
          </div>
        </section>
      </div>
    </PageShell>
  );
}

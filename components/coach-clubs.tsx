import Link from "next/link";
import { respondToClubInvite } from "@/app/dashboard/club/[clubId]/actions";
import { SubmitButton } from "@/components/submit-button";
import { SectionHeading } from "@/components/ui";
import { CLUB_ROLE_LABELS } from "@/lib/clubs";
import type { CoachClub } from "@/lib/clubs.server";
import { countryWithFlag } from "@/lib/players";

/**
 * The clubs on a coach's home. Nothing renders when they belong to none — a
 * coach who runs no club should not be told a club feature exists every time
 * they sign in.
 */
export function CoachClubs({ invited, member }: { invited: CoachClub[]; member: CoachClub[] }) {
  if (!member.length && !invited.length) return null;

  return (
    <div>
      <SectionHeading>Your clubs</SectionHeading>
      <ul className="mt-3.5 border-b border-cream-400">
        {member.map((club) => (
          <li
            className="flex items-center justify-between gap-5 border-t border-cream-400 py-3.5"
            key={club.id}
          >
            <div className="min-w-0">
              <Link
                className="text-ui font-semibold text-ink-900 no-underline hover:text-rust-700"
                href={`/dashboard/club/${club.id}`}
              >
                {club.name}
              </Link>
              <p className="mt-0.5 text-caption text-ink-600">
                {countryWithFlag(club.country)} · {CLUB_ROLE_LABELS[club.role]}
              </p>
            </div>
          </li>
        ))}
        {invited.map((club) => (
          <li
            className="flex items-center justify-between gap-5 border-t border-cream-400 py-3.5"
            key={club.id}
          >
            <div className="min-w-0">
              <p className="text-ui font-semibold text-ink-900">{club.name}</p>
              <p className="mt-0.5 text-caption text-ink-600">
                {countryWithFlag(club.country)} · Invited you to help run this club
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <form action={respondToClubInvite}>
                <input name="clubId" type="hidden" value={club.id} />
                <input name="intent" type="hidden" value="accept" />
                <SubmitButton className="!px-[18px] !py-2 !text-ui">Accept</SubmitButton>
              </form>
              <form action={respondToClubInvite}>
                <input name="clubId" type="hidden" value={club.id} />
                <input name="intent" type="hidden" value="decline" />
                <SubmitButton variant="quiet">Decline</SubmitButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { ClubCoachRole } from "@/app/generated/prisma/enums";

/** Matches the CHECK constraints in the add_clubs migration. */
export const MAX_CLUB_BIO_LENGTH = 500;
export const MIN_CLUB_NAME_LENGTH = 2;
export const MAX_CLUB_NAME_LENGTH = 120;

export const CLUB_ROLE_LABELS: Record<ClubCoachRole, string> = {
  [ClubCoachRole.OWNER]: "Owner",
  [ClubCoachRole.MEMBER]: "Coach",
};

/**
 * How a club name is compared to the free-text club a player typed at
 * onboarding. Case and spacing are noise; everything else is signal.
 *
 * Deliberately not fuzzy. A near-match here is a stranger asking a
 * fourteen-year-old to connect, so "Riverside CC" claims players who wrote
 * "riverside  cc" and nobody else. A club whose players typed something else
 * invites them by username like anyone would.
 */
export function normalizeClubName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

export function clubNameMatches(a: string, b: string): boolean {
  const left = normalizeClubName(a);
  return left.length > 0 && left === normalizeClubName(b);
}

export function isValidClubName(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.length >= MIN_CLUB_NAME_LENGTH && trimmed.length <= MAX_CLUB_NAME_LENGTH;
}

/**
 * The auto-match action must only send requests to players the claim list
 * would show. Submitted ids that are not on that list are a crafted request,
 * not a stale checkbox — refuse the whole batch rather than sending the
 * eligible ones and pretending the rest were ignored.
 */
export function partitionClaimIds(
  submitted: string[],
  claimableIds: Iterable<string>,
): { eligible: string[]; rejected: string[] } {
  const allowed = new Set(claimableIds);
  const eligible: string[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();

  for (const id of submitted) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (allowed.has(id)) eligible.push(id);
    else rejected.push(id);
  }

  return { eligible, rejected };
}

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

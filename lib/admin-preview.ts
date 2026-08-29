import "server-only";
import { cookies } from "next/headers";
import { isUuid } from "@/app/api/videos/utils";
import { CoachStatus } from "@/app/generated/prisma/enums";
import { isAdmin, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Which coach an administrator is currently looking at. Inert on any other account. */
export const ADMIN_PREVIEW_COOKIE = "nextxi-admin-preview";
/** An hour: long enough to look around, short enough not to be forgotten. */
export const ADMIN_PREVIEW_MAX_AGE = 60 * 60;

export type AdminPreview = { coachId: string; name: string };

/**
 * An administrator reading a coach's dashboard — the approval queue and the
 * review screen as that coach sees them.
 *
 * Read-only by construction rather than by a flag: every write in the app
 * authorises against the signed-in user, and an admin is not that coach, so
 * `approveReport` and `addVideoComment` would refuse them whatever this
 * returns. The preview hides those controls instead of offering buttons that
 * fail, and skips the one write a coach's own visit performs — marking a clip
 * seen, which would quietly empty a real coach's new-clips list.
 *
 * A cookie is the carrier because a query parameter would have to be threaded
 * through every link on the page. It grants nothing on its own: this re-reads
 * the admin list on every call, so the cookie is inert on any other account.
 */
export async function getAdminPreview(user: SessionUser | null): Promise<AdminPreview | null> {
  if (!isAdmin(user)) return null;

  const coachId = (await cookies()).get(ADMIN_PREVIEW_COOKIE)?.value;
  if (!coachId || !isUuid(coachId)) return null;

  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    select: { name: true, status: true },
  });
  if (!coach || coach.status !== CoachStatus.APPROVED) return null;

  return { coachId, name: coach.name };
}

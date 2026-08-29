"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import { ClubCoachRole, ClubStatus, CoachStatus, ConnectionStatus } from "@/app/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { partitionClaimIds } from "@/lib/clubs";
import { getClaimablePlayers, getClubAccess } from "@/lib/clubs.server";
import { createConnectionRequest } from "@/lib/connections";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function done(clubId: string, key: "clubError" | "clubMessage", message: string): never {
  revalidatePath(`/dashboard/club/${clubId}`);
  redirect(`/dashboard/club/${clubId}?${key}=${encodeURIComponent(message)}`);
}

/** Anyone who may open the dashboard. */
async function requireAccess(formData: FormData) {
  const user = await requireUser();
  const clubId = text(formData, "clubId");
  if (!isUuid(clubId)) redirect("/dashboard");

  const access = await getClubAccess(user.id, clubId);
  if (!access) redirect("/dashboard");

  return { access, clubId, user };
}

/** Membership is the club's own decision: its account, or an owner coach. */
async function requireManager(formData: FormData) {
  const context = await requireAccess(formData);
  const { access, clubId } = context;

  if (access.viewer !== "club" && access.role !== ClubCoachRole.OWNER) {
    done(clubId, "clubError", "Only the club and its owners can change who has access.");
  }
  if (access.club.status !== ClubStatus.APPROVED) {
    done(clubId, "clubError", "This club is still under review.");
  }

  return context;
}

/**
 * Ask the players who typed this club's name to connect.
 *
 * Deliberately a request, not a connection: a club claiming a name does not
 * get to see a fourteen-year-old's footage until that player says yes. The
 * shared core in lib/connections.ts carries the eligibility rules, including
 * the refusal to reach a minor whose guardian hasn't activated the account.
 */
export async function claimPlayers(formData: FormData) {
  const { access, clubId } = await requireAccess(formData);

  if (access.club.status !== ClubStatus.APPROVED) {
    done(clubId, "clubError", "This club is still under review.");
  }

  const playerIds = formData
    .getAll("playerId")
    .filter((value): value is string => typeof value === "string" && isUuid(value));

  if (!playerIds.length) done(clubId, "clubError", "Select at least one player.");

  // The list is exact name-match + public + never-asked. Re-check here so a
  // crafted POST cannot ask a child who never named this club.
  const { eligible, rejected } = partitionClaimIds(
    playerIds,
    (await getClaimablePlayers(clubId)).map((player) => player.id),
  );
  if (rejected.length) {
    done(clubId, "clubError", "Those players are not on your list.");
  }
  if (!eligible.length) done(clubId, "clubError", "Select at least one player.");

  let sent = 0;
  for (const playerId of eligible) {
    const outcome = await createConnectionRequest(clubId, playerId);
    if ("message" in outcome) sent += 1;
  }

  if (!sent) done(clubId, "clubError", "No requests could be sent.");

  revalidatePath("/dashboard/connections");
  done(
    clubId,
    "clubMessage",
    sent === 1
      ? "Request sent. The player decides whether to accept."
      : `${sent} requests sent. Each player decides whether to accept.`,
  );
}

/** Invite an approved coach by username; they accept from their own home. */
export async function inviteClubCoach(formData: FormData) {
  const { clubId, user } = await requireManager(formData);
  const username = text(formData, "username");

  if (!username) done(clubId, "clubError", "Enter a coach's username.");

  const profile = await prisma.profile.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!profile) done(clubId, "clubError", "No user found for that username.");

  const coach = await prisma.coach.findUnique({
    where: { id: profile.id },
    select: { status: true },
  });
  if (!coach) done(clubId, "clubError", "That account isn't a coach.");
  if (coach.status !== CoachStatus.APPROVED) {
    done(clubId, "clubError", "That coach is still under review.");
  }

  const existing = await prisma.clubCoach.findUnique({
    where: { clubId_coachId: { clubId, coachId: profile.id } },
    select: { id: true, status: true },
  });

  if (existing?.status === ConnectionStatus.ACCEPTED) {
    done(clubId, "clubError", "That coach is already in the club.");
  }
  if (existing?.status === ConnectionStatus.PENDING) {
    done(clubId, "clubError", "That invitation is already pending.");
  }

  if (existing) {
    // A removed coach can be invited back; the unique pair means one row only.
    await prisma.clubCoach.update({
      where: { id: existing.id },
      data: { status: ConnectionStatus.PENDING, invitedById: user.id, role: ClubCoachRole.MEMBER },
    });
  } else {
    await prisma.clubCoach.create({
      data: { clubId, coachId: profile.id, invitedById: user.id },
    });
  }

  revalidatePath("/dashboard/coach");
  done(clubId, "clubMessage", "Invitation sent.");
}

/** Remove a coach's access. The club's own account can never be removed. */
export async function removeClubCoach(formData: FormData) {
  const { access, clubId, user } = await requireManager(formData);
  const coachId = text(formData, "coachId");
  if (!isUuid(coachId)) done(clubId, "clubError", "Invalid request.");

  if (coachId === user.id && access.viewer === "coach") {
    done(clubId, "clubError", "Ask the club to remove your own access.");
  }

  const { count } = await prisma.clubCoach.updateMany({
    where: { clubId, coachId, status: { in: [ConnectionStatus.ACCEPTED, ConnectionStatus.PENDING] } },
    data: { status: ConnectionStatus.REVOKED },
  });

  if (count === 0) done(clubId, "clubError", "That coach is no longer in the club.");

  revalidatePath("/dashboard/coach");
  done(clubId, "clubMessage", "Access removed.");
}

/**
 * A coach answering an invitation, from their own home. Guarded on the coach's
 * own id rather than on club access — they have none until they accept.
 */
export async function respondToClubInvite(formData: FormData) {
  const user = await requireUser();
  const clubId = text(formData, "clubId");
  const accept = text(formData, "intent") === "accept";

  if (!isUuid(clubId)) redirect("/dashboard/coach");

  const { count } = await prisma.clubCoach.updateMany({
    where: { clubId, coachId: user.id, status: ConnectionStatus.PENDING },
    data: { status: accept ? ConnectionStatus.ACCEPTED : ConnectionStatus.REVOKED },
  });

  revalidatePath("/dashboard/coach");
  if (accept && count > 0) redirect(`/dashboard/club/${clubId}`);

  const message = count === 0 ? "That invitation is no longer open." : "Invitation declined.";
  redirect(`/dashboard/coach?${count === 0 ? "error" : "message"}=${encodeURIComponent(message)}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/app/generated/prisma/client";
import { Visibility, type Handedness } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AVATAR_BUCKET } from "@/lib/avatars";
import { parseCoachSpecialties } from "@/lib/coaches";
import { notifyTeam } from "@/lib/notify";
import { isCountry, parsePlayerRoles } from "@/lib/players";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isHandedness } from "@/lib/videos";

const MAX_BIO_LENGTH = 500;

const usernamePattern = /^[a-z0-9_]{3,30}$/;
const INVALID_NUMBER = Symbol("invalid-number");

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optionalInt(formData: FormData, name: string, min: number, max: number) {
  const raw = text(formData, name);
  if (!raw) return null;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) return INVALID_NUMBER;

  return value;
}

const INVALID_TEXT = Symbol("invalid-text");

function optionalBio(formData: FormData) {
  const raw = text(formData, "bio");
  if (!raw) return null;
  return raw.length > MAX_BIO_LENGTH ? INVALID_TEXT : raw;
}

function optionalAvatarPath(formData: FormData) {
  return text(formData, "avatarPath") || null;
}

const INVALID_HANDEDNESS = Symbol("invalid-handedness");

function optionalHandedness(formData: FormData, name: string) {
  const raw = text(formData, name);
  if (!raw) return null;
  return isHandedness(raw) ? (raw as Handedness) : INVALID_HANDEDNESS;
}

function parseLines(formData: FormData, name: string) {
  return text(formData, name)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileError(message: string): never {
  redirect(`/dashboard/profile?error=${encodeURIComponent(message)}`);
}

function isUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const username = text(formData, "username").toLowerCase();
  const name = text(formData, "name");

  if (!usernamePattern.test(username)) {
    profileError("Use 3-30 letters, numbers, or underscores for username.");
  }
  if (!name) profileError("Enter your name.");

  const [player, coach] = await Promise.all([
    prisma.player.findUnique({ where: { id: user.id }, select: { id: true } }),
    prisma.coach.findUnique({ where: { id: user.id }, select: { id: true } }),
  ]);

  let roleUpdate: Prisma.PrismaPromise<unknown>;

  if (player) {
    const club = text(formData, "club");
    const country = text(formData, "country");
    const roles = parsePlayerRoles(formData);
    const heightCm = optionalInt(formData, "heightCm", 1, 300);
    const weightKg = optionalInt(formData, "weightKg", 1, 500);
    const bio = optionalBio(formData);
    const avatarPath = optionalAvatarPath(formData);
    const battingHandedness = optionalHandedness(formData, "battingHandedness");
    const bowlingHandedness = optionalHandedness(formData, "bowlingHandedness");
    // The switch only submits its value when on, so absence means Private.
    const visibility =
      formData.get("visibility") === "public" ? Visibility.PUBLIC : Visibility.PRIVATE;

    if (!club) profileError("Complete all player fields.");
    if (!isCountry(country)) profileError("Select a valid country.");
    if (heightCm === null || heightCm === INVALID_NUMBER) {
      profileError("Enter a valid height.");
    }
    if (weightKg === INVALID_NUMBER) {
      profileError("Enter a valid weight, or leave it blank.");
    }
    if (bio === INVALID_TEXT) {
      profileError(`Bio must be ${MAX_BIO_LENGTH} characters or fewer.`);
    }
    if (battingHandedness === INVALID_HANDEDNESS || bowlingHandedness === INVALID_HANDEDNESS) {
      profileError("Choose a valid handedness, or leave it unset.");
    }

    roleUpdate = prisma.player.update({
      where: { id: user.id },
      data: {
        avatarPath,
        battingHandedness,
        bio,
        bowlingHandedness,
        club,
        country,
        heightCm,
        name,
        roles,
        visibility,
        weightKg,
      },
    });
  } else if (coach) {
    const club = text(formData, "club") || null;
    const certifications = parseLines(formData, "certifications");
    const specialties = parseCoachSpecialties(formData);
    const bio = optionalBio(formData);
    const avatarPath = optionalAvatarPath(formData);

    if (bio === INVALID_TEXT) {
      profileError(`Bio must be ${MAX_BIO_LENGTH} characters or fewer.`);
    }

    roleUpdate = prisma.coach.update({
      where: { id: user.id },
      data: {
        avatarPath,
        bio,
        certifications,
        club,
        name,
        specialties,
      },
    });
  } else {
    redirect("/onboarding");
  }

  try {
    await prisma.$transaction([
      prisma.profile.update({ where: { id: user.id }, data: { username } }),
      roleUpdate,
    ]);
  } catch (error) {
    if (!isUniqueError(error)) throw error;
    profileError("Username is taken.");
  }

  revalidatePath("/dashboard/profile");
  redirect(`/dashboard/profile?message=${encodeURIComponent("Profile updated.")}`);
}

export async function removeAvatar() {
  const user = await requireUser();

  const [player, coach] = await Promise.all([
    prisma.player.findUnique({ where: { id: user.id }, select: { avatarPath: true } }),
    prisma.coach.findUnique({ where: { id: user.id }, select: { avatarPath: true } }),
  ]);

  const avatarPath = player?.avatarPath ?? coach?.avatarPath;
  if (!avatarPath) return;

  const supabaseAdmin = createSupabaseAdminClient();
  await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([avatarPath]);

  if (player) {
    await prisma.player.update({ where: { id: user.id }, data: { avatarPath: null } });
  } else if (coach) {
    await prisma.coach.update({ where: { id: user.id }, data: { avatarPath: null } });
  }

  revalidatePath("/dashboard/profile");
}

export async function deleteAccount(formData: FormData) {
  const user = await requireUser();

  if (text(formData, "confirm") !== "DELETE") {
    profileError("Type DELETE to confirm account deletion.");
  }

  // A guardian leaving would strip their linked player of oversight, so the
  // player's account has to be deleted first.
  const linkedChildren = await prisma.player.count({ where: { guardianId: user.id } });
  if (linkedChildren > 0) {
    redirect(
      `/dashboard/guardian?error=${encodeURIComponent(
        "Your account oversees a linked player, so it can't be deleted. Delete the player's account first.",
      )}`,
    );
  }

  // Collect storage objects before their rows disappear.
  const [videos, player, coach] = await Promise.all([
    prisma.playerVideo.findMany({
      where: { playerId: user.id },
      select: { storageBucket: true, storagePath: true, thumbnailPath: true },
    }),
    prisma.player.findUnique({ where: { id: user.id }, select: { avatarPath: true } }),
    prisma.coach.findUnique({ where: { id: user.id }, select: { avatarPath: true } }),
  ]);

  // Rows first (children before parents: messages under connections; reports,
  // comments, and views under videos; videos under the player), storage
  // second: an orphaned storage object is preferable to a row whose file is
  // gone. deleteMany is a no-op for rows the account never had.
  await prisma.$transaction([
    prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: user.id },
          { connection: { OR: [{ userAId: user.id }, { userBId: user.id }] } },
        ],
      },
    }),
    prisma.connection.deleteMany({
      where: {
        OR: [{ userAId: user.id }, { userBId: user.id }, { requestedById: user.id }],
      },
    }),
    prisma.videoComment.deleteMany({
      where: { OR: [{ authorId: user.id }, { video: { playerId: user.id } }] },
    }),
    prisma.videoView.deleteMany({
      where: { OR: [{ viewerId: user.id }, { video: { playerId: user.id } }] },
    }),
    prisma.report.deleteMany({ where: { video: { playerId: user.id } } }),
    prisma.playerVideo.deleteMany({ where: { playerId: user.id } }),
    prisma.practiceSession.deleteMany({ where: { playerId: user.id } }),
    prisma.statEntry.deleteMany({ where: { playerId: user.id } }),
    prisma.goal.deleteMany({ where: { playerId: user.id } }),
    prisma.reminder.deleteMany({ where: { playerId: user.id } }),
    prisma.player.deleteMany({ where: { id: user.id } }),
    prisma.coach.deleteMany({ where: { id: user.id } }),
    prisma.guardian.deleteMany({ where: { id: user.id } }),
    prisma.profile.deleteMany({ where: { id: user.id } }),
  ]);

  const supabaseAdmin = createSupabaseAdminClient();

  // Best-effort storage cleanup, grouped per bucket.
  const pathsByBucket = new Map<string, string[]>();
  for (const video of videos) {
    const paths = pathsByBucket.get(video.storageBucket) ?? [];
    paths.push(video.storagePath);
    if (video.thumbnailPath) paths.push(video.thumbnailPath);
    pathsByBucket.set(video.storageBucket, paths);
  }
  const avatarPath = player?.avatarPath ?? coach?.avatarPath;
  if (avatarPath) {
    pathsByBucket.set(AVATAR_BUCKET, [
      ...(pathsByBucket.get(AVATAR_BUCKET) ?? []),
      avatarPath,
    ]);
  }

  for (const [bucket, paths] of pathsByBucket) {
    try {
      await supabaseAdmin.storage.from(bucket).remove(paths);
    } catch {
      // Best effort — the account data is already gone from the app.
    }
  }

  // Removing the auth user is what actually closes the account. If it fails,
  // the app rows are already gone, so flag the empty orphaned sign-in for
  // manual removal instead of stranding the user mid-deletion.
  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (authDeleteError) {
    // Non-fatal by design: notifyTeam swallows its own errors.
    await notifyTeam(
      `Account deletion: auth user ${user.id} could not be removed (${authDeleteError.message}).`,
    );
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

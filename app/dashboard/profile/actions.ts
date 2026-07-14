"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/app/generated/prisma/client";
import { Visibility, type Handedness } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AVATAR_BUCKET } from "@/lib/avatars";
import { parseCoachSpecialties } from "@/lib/coaches";
import { isCountry, parsePlayerRoles } from "@/lib/players";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

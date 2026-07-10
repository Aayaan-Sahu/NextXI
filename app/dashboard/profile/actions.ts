"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { isCountry, parsePlayerRoles } from "@/lib/players";

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

    if (!club) profileError("Complete all player fields.");
    if (!isCountry(country)) profileError("Select a valid country.");
    if (heightCm === null || heightCm === INVALID_NUMBER) {
      profileError("Enter a valid height.");
    }
    if (weightKg === INVALID_NUMBER) {
      profileError("Enter a valid weight, or leave it blank.");
    }

    roleUpdate = prisma.player.update({
      where: { id: user.id },
      data: { club, country, heightCm, name, roles, weightKg },
    });
  } else if (coach) {
    const accomplishments = text(formData, "accomplishments")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    roleUpdate = prisma.coach.update({
      where: { id: user.id },
      data: { accomplishments, name },
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

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .toLowerCase()
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean),
);

export function isAdmin(user: Pick<User, "email"> | null | undefined) {
  const email = user?.email?.toLowerCase();
  return Boolean(email && ADMIN_EMAILS.has(email));
}

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) return null;
  return data.user;
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (!isAdmin(user)) {
    redirect("/dashboard");
  }

  return user;
}

export const getOnboardingStatus = cache(async (userId: string) => {
  const [player, coach] = await Promise.all([
    prisma.player.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.coach.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);

  return {
    role: player ? "player" : coach ? "coach" : null,
  };
});

export const getProfile = cache(async (userId: string) => {
  const [profile, player, coach] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: userId },
      select: { username: true },
    }),
    prisma.player.findUnique({
      where: { id: userId },
      select: {
        club: true,
        country: true,
        dateOfBirth: true,
        heightCm: true,
        name: true,
        visibility: true,
        weightKg: true,
      },
    }),
    prisma.coach.findUnique({
      where: { id: userId },
      select: { accomplishments: true, name: true, status: true },
    }),
  ]);

  if (player) return { player, role: "player" as const, username: profile?.username ?? null };
  if (coach) return { coach, role: "coach" as const, username: profile?.username ?? null };
  return { role: null };
});

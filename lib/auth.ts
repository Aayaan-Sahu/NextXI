import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
        name: true,
        visibility: true,
      },
    }),
    prisma.coach.findUnique({
      where: { id: userId },
      select: { accomplishments: true, name: true },
    }),
  ]);

  if (player) return { player, role: "player" as const, username: profile?.username ?? null };
  if (coach) return { coach, role: "coach" as const, username: profile?.username ?? null };
  return { role: null };
});

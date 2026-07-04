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

export type SessionUser = { id: string; email?: string };

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  // Verifies the session JWT locally (asymmetric keys + process-wide JWKS
  // cache) instead of a network round-trip to the auth server per request.
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) return null;
  return { id: data.claims.sub, email: data.claims.email };
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
  const [player, coach, guardian] = await Promise.all([
    prisma.player.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.coach.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.guardian.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);

  return {
    role: player ? "player" : coach ? "coach" : guardian ? "guardian" : null,
  };
});

export const getProfile = cache(async (userId: string) => {
  const [profile, player, coach, guardian] = await Promise.all([
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
        guardianCode: true,
        heightCm: true,
        name: true,
        status: true,
        visibility: true,
        weightKg: true,
      },
    }),
    prisma.coach.findUnique({
      where: { id: userId },
      select: { accomplishments: true, name: true, status: true },
    }),
    prisma.guardian.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
  ]);

  if (player) return { player, role: "player" as const, username: profile?.username ?? null };
  if (coach) return { coach, role: "coach" as const, username: profile?.username ?? null };
  if (guardian) return { guardian, role: "guardian" as const, username: profile?.username ?? null };
  return { role: null };
});

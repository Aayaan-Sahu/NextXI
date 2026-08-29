import { CoachStatus, PlayerStatus } from "@/app/generated/prisma/enums";
import { apiHandler } from "@/lib/api";
import { getProfile, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/me — the signed-in account as the apps need it on launch: who
 * they are, which role (if any) they have onboarded as, and what that role
 * and its status currently allow. One request answers "which tab bar do I
 * show, and is anything gated".
 *
 * `limits` restate rules that already live in the Server Actions (upload:
 * app/api/videos/utils.ts; messaging and connections:
 * app/dashboard/{messages,connections}/actions.ts) so the app can hide a
 * control instead of showing it and failing.
 */
export const GET = apiHandler({ auth: "user" }, async ({ user }) => {
  const profile = await getProfile(user.id);

  const limits = {
    canUpload: profile.role === "player" && profile.player.status === PlayerStatus.ACTIVE,
    canMessage:
      (profile.role === "player" && profile.player.status === PlayerStatus.ACTIVE) ||
      (profile.role === "coach" && profile.coach.status === CoachStatus.APPROVED),
    canConnect:
      (profile.role === "player" && profile.player.status === PlayerStatus.ACTIVE) ||
      (profile.role === "coach" && profile.coach.status === CoachStatus.APPROVED),
  };

  return {
    user: { id: user.id, email: user.email ?? null },
    isAdmin: isAdmin(user),
    onboardingRequired: profile.role === null,
    role: profile.role,
    username: profile.role === null ? null : profile.username,
    player: profile.role === "player" ? profile.player : null,
    coach: profile.role === "coach" ? profile.coach : null,
    guardian: profile.role === "guardian" ? profile.guardian : null,
    limits,
  };
});

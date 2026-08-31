"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { normalizeGuardianCode } from "@/lib/guardian-code";
import { notifyTeam } from "@/lib/notify";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function linkError(childId: string, message: string): never {
  const childQuery = childId ? `child=${encodeURIComponent(childId)}&` : "";
  redirect(`/dashboard/guardian?${childQuery}error=${encodeURIComponent(message)}`);
}

/**
 * Links another player to an existing guardian account by claiming the child's
 * guardian code — the same single-use, race-safe claim guardian onboarding
 * performs (app/auth/actions.ts). The code, not the account's status, is what
 * a guardian claims: players open ACTIVE and a held code is simply gone.
 */
export async function linkChild(formData: FormData) {
  const user = await requireUser();

  const guardian = await prisma.guardian.findUnique({
    where: { id: user.id },
    select: { id: true },
  });
  if (!guardian) redirect("/dashboard");

  // Preserves the child switcher selection across error redirects.
  const selectedChildId = text(formData, "child");
  const code = normalizeGuardianCode(text(formData, "childCode"));

  if (!code) linkError(selectedChildId, "Enter the code shown on your child's dashboard.");

  const unclaimedChild = await prisma.player.findFirst({
    where: { guardianCode: code, guardianId: null },
    select: { id: true, name: true },
  });

  if (!unclaimedChild) {
    linkError(selectedChildId, "That code doesn't match a player account.");
  }

  // The guarded updateMany is the atomic claim: if another guardian linked
  // this code first, count is 0 and nothing changes.
  const linked = await prisma.player.updateMany({
    where: { guardianCode: code, guardianId: null },
    data: { guardianId: user.id, guardianCode: null },
  });

  if (linked.count === 0) {
    linkError(selectedChildId, "That code doesn't match a player account.");
  }

  // Non-fatal by design: notifyTeam swallows its own errors.
  await notifyTeam(`Guardian linked another child: ${unclaimedChild.name}`);

  revalidatePath("/dashboard/guardian");
  redirect(
    `/dashboard/guardian?child=${unclaimedChild.id}&message=${encodeURIComponent(
      `${unclaimedChild.name} is now linked to your account.`,
    )}`,
  );
}

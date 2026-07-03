"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CoachStatus } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function done(key: "error" | "message", value: string): never {
  redirect(`/dashboard/admin?${key}=${encodeURIComponent(value)}`);
}

async function setCoachStatus(formData: FormData, status: CoachStatus, message: string) {
  await requireAdmin();

  const coachId = text(formData, "coachId");
  if (!coachId) done("error", "Invalid request.");

  const result = await prisma.coach.updateMany({
    where: { id: coachId, status: CoachStatus.PENDING },
    data: { status },
  });

  if (result.count === 0) done("error", "That coach is no longer pending.");

  revalidatePath("/dashboard/admin");
  done("message", message);
}

export async function approveCoach(formData: FormData) {
  await setCoachStatus(formData, CoachStatus.APPROVED, "Coach approved.");
}

export async function rejectCoach(formData: FormData) {
  await setCoachStatus(formData, CoachStatus.REJECTED, "Coach rejected.");
}

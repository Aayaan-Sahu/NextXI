"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Loose on purpose — the address is only used to send one launch email.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type WaitlistActionState =
  | { status: "idle" }
  | { status: "invalid"; email: string }
  | { status: "joined" };

function isUniqueError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function joinWaitlist(
  _prevState: WaitlistActionState,
  formData: FormData,
): Promise<WaitlistActionState> {
  const raw = formData.get("email");
  const typed = typeof raw === "string" ? raw.trim() : "";
  const email = typed.toLowerCase();

  // Return the typed address with the invalid state so the form can re-fill
  // the input — a full redirect used to erase it at the conversion moment.
  if (!emailPattern.test(email)) {
    return { status: "invalid", email: typed };
  }

  try {
    await prisma.waitlistEntry.create({ data: { email } });
  } catch (error) {
    // Duplicate signups read as success so the form doesn't leak who's on the list.
    if (!isUniqueError(error)) throw error;
  }

  return { status: "joined" };
}

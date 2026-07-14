"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Loose on purpose — the address is only used to send one launch email.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isUniqueError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function joinWaitlist(formData: FormData) {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  if (!emailPattern.test(email)) {
    redirect("/?waitlist=invalid#waitlist");
  }

  try {
    await prisma.waitlistEntry.create({ data: { email } });
  } catch (error) {
    // Duplicate signups read as success so the form doesn't leak who's on the list.
    if (!isUniqueError(error)) throw error;
  }

  redirect("/?waitlist=joined#waitlist");
}

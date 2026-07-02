import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function getApiPlayer() {
  const user = await getCurrentUser();

  if (!user) {
    return { response: jsonError("Authentication required.", 401) };
  }

  const player = await prisma.player.findUnique({
    where: { id: user.id },
    select: { id: true },
  });

  if (!player) {
    return { response: jsonError("Player account required.", 403) };
  }

  return { player, user };
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

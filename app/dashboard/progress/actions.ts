"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isUuid } from "@/app/api/videos/utils";
import { PlayerStatus } from "@/app/generated/prisma/enums";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const INVALID = Symbol("invalid");

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optionalInt(formData: FormData, name: string, min: number, max: number) {
  const raw = text(formData, name);
  if (!raw) return null;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) return INVALID;

  return value;
}

/** Overs use cricket's `.1`–`.5` notation (whole overs plus balls). */
function optionalOvers(raw: string): string | null | typeof INVALID {
  if (!raw) return null;
  if (!/^\d{1,3}(\.[0-5])?$/.test(raw)) return INVALID;
  return raw;
}

function optionalDecimal(raw: string, min: number, max: number): string | null | typeof INVALID {
  if (!raw) return null;

  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return INVALID;

  return (Math.round(value * 100) / 100).toString();
}

function requiredDate(raw: string): Date | typeof INVALID {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return INVALID;

  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? INVALID : date;
}

function optionalDate(raw: string): Date | null | typeof INVALID {
  if (!raw) return null;
  return requiredDate(raw);
}

function finish(params: { error?: string; message?: string } = {}): never {
  revalidatePath("/dashboard/progress");

  const query = new URLSearchParams();
  if (params.error) query.set("error", params.error);
  if (params.message) query.set("message", params.message);

  const qs = query.toString();
  redirect(qs ? `/dashboard/progress?${qs}` : "/dashboard/progress");
}

/**
 * Ensures the signed-in user is an active player and returns their id. Every
 * mutation below scopes its writes to this id so a player can only touch their
 * own rows.
 */
async function requirePlayerId(): Promise<string> {
  const user = await requireUser();

  const player = await prisma.player.findUnique({
    where: { id: user.id },
    select: { id: true, status: true },
  });

  if (!player) redirect("/dashboard");
  if (player.status !== PlayerStatus.ACTIVE) redirect("/dashboard/player");

  return player.id;
}

/**
 * Normalizes a pasted stats link to a safe absolute URL. Adds a default
 * `https://` when the player omits the scheme, then hard-rejects anything that
 * isn't plain http(s) — this value is later rendered as an `href`, so schemes
 * like `javascript:` must never survive validation.
 */
function normalizeStatsUrl(raw: string): string | typeof INVALID {
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return INVALID;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return INVALID;
  if (!url.hostname.includes(".")) return INVALID;

  return url.toString();
}

export async function saveStatsLink(formData: FormData) {
  const playerId = await requirePlayerId();

  const raw = text(formData, "statsUrl");
  if (!raw) finish({ error: "Paste a link to your public stats." });
  if (raw.length > 500) finish({ error: "That link is too long." });

  const statsUrl = normalizeStatsUrl(raw);
  if (statsUrl === INVALID) {
    finish({ error: "Enter a valid link, e.g. https://your-club.play-cricket.com/..." });
  }

  await prisma.player.update({
    where: { id: playerId },
    data: { statsUrl },
  });

  finish({ message: "Stats link saved." });
}

export async function removeStatsLink() {
  const playerId = await requirePlayerId();

  await prisma.player.update({
    where: { id: playerId },
    data: { statsUrl: null },
  });

  finish({ message: "Stats link removed." });
}

export async function addStatEntry(formData: FormData) {
  const playerId = await requirePlayerId();

  const matchDate = requiredDate(text(formData, "matchDate"));
  if (matchDate === INVALID) finish({ error: "Enter a valid match date." });

  const opponentRaw = text(formData, "opponent");
  if (opponentRaw.length > 120) finish({ error: "Opponent name is too long." });

  const dismissalRaw = text(formData, "dismissal");
  if (dismissalRaw.length > 60) finish({ error: "Dismissal is too long." });

  const runs = optionalInt(formData, "runs", 0, 1000);
  const ballsFaced = optionalInt(formData, "ballsFaced", 0, 2000);
  const wickets = optionalInt(formData, "wickets", 0, 10);
  const runsConceded = optionalInt(formData, "runsConceded", 0, 1000);
  const oversBowled = optionalOvers(text(formData, "oversBowled"));

  if (
    runs === INVALID ||
    ballsFaced === INVALID ||
    wickets === INVALID ||
    runsConceded === INVALID
  ) {
    finish({ error: "Check the batting and bowling numbers you entered." });
  }
  if (oversBowled === INVALID) {
    finish({ error: "Overs must use .1–.5 notation, e.g. 4.3." });
  }

  const dismissal = dismissalRaw || null;
  const hasBatting = runs !== null || ballsFaced !== null || dismissal !== null;
  const hasBowling = oversBowled !== null || wickets !== null || runsConceded !== null;

  if (!hasBatting && !hasBowling) {
    finish({ error: "Add batting or bowling details for this match." });
  }

  await prisma.statEntry.create({
    data: {
      playerId,
      matchDate,
      opponent: opponentRaw || null,
      runs,
      ballsFaced,
      dismissal,
      oversBowled,
      wickets,
      runsConceded,
    },
  });

  finish({ message: "Match logged." });
}

export async function deleteStatEntry(formData: FormData) {
  const playerId = await requirePlayerId();

  const id = text(formData, "id");
  if (!isUuid(id)) finish({ error: "Could not delete that entry." });

  await prisma.statEntry.deleteMany({ where: { id, playerId } });
  finish({ message: "Match removed." });
}

export async function createGoal(formData: FormData) {
  const playerId = await requirePlayerId();

  const title = text(formData, "title");
  if (!title || title.length > 200) {
    finish({ error: "Enter a goal title (up to 200 characters)." });
  }

  const metricRaw = text(formData, "metric");
  if (metricRaw.length > 80) finish({ error: "Metric name is too long." });

  const target = optionalDecimal(text(formData, "target"), 0, 99999999.99);
  if (target === INVALID) finish({ error: "Enter a valid target number." });

  const horizonDate = optionalDate(text(formData, "horizonDate"));
  if (horizonDate === INVALID) finish({ error: "Enter a valid target date." });

  await prisma.goal.create({
    data: {
      playerId,
      title,
      metric: metricRaw || null,
      target,
      horizonDate,
    },
  });

  finish({ message: "Goal added." });
}

export async function toggleGoalComplete(formData: FormData) {
  const playerId = await requirePlayerId();

  const id = text(formData, "id");
  if (!isUuid(id)) finish({ error: "Could not update that goal." });

  const goal = await prisma.goal.findFirst({
    where: { id, playerId },
    select: { completedAt: true },
  });
  if (!goal) finish({ error: "Goal not found." });

  await prisma.goal.update({
    where: { id },
    data: { completedAt: goal.completedAt ? null : new Date() },
  });

  finish({ message: goal.completedAt ? "Goal reopened." : "Goal completed." });
}

export async function deleteGoal(formData: FormData) {
  const playerId = await requirePlayerId();

  const id = text(formData, "id");
  if (!isUuid(id)) finish({ error: "Could not delete that goal." });

  await prisma.goal.deleteMany({ where: { id, playerId } });
  finish({ message: "Goal removed." });
}

export async function createReminder(formData: FormData) {
  const playerId = await requirePlayerId();

  const body = text(formData, "text");
  if (!body || body.length > 300) {
    finish({ error: "Enter a reminder (up to 300 characters)." });
  }

  const dueAt = optionalDate(text(formData, "dueAt"));
  if (dueAt === INVALID) finish({ error: "Enter a valid due date." });

  await prisma.reminder.create({
    data: { playerId, text: body, dueAt },
  });

  finish({ message: "Reminder added." });
}

export async function toggleReminderComplete(formData: FormData) {
  const playerId = await requirePlayerId();

  const id = text(formData, "id");
  if (!isUuid(id)) finish({ error: "Could not update that reminder." });

  const reminder = await prisma.reminder.findFirst({
    where: { id, playerId },
    select: { completedAt: true },
  });
  if (!reminder) finish({ error: "Reminder not found." });

  await prisma.reminder.update({
    where: { id },
    data: { completedAt: reminder.completedAt ? null : new Date() },
  });

  finish({ message: reminder.completedAt ? "Reminder reopened." : "Reminder done." });
}

export async function deleteReminder(formData: FormData) {
  const playerId = await requirePlayerId();

  const id = text(formData, "id");
  if (!isUuid(id)) finish({ error: "Could not delete that reminder." });

  await prisma.reminder.deleteMany({ where: { id, playerId } });
  finish({ message: "Reminder removed." });
}

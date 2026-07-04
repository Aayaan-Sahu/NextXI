import { prisma } from "@/lib/prisma";

export type StatEntryItem = {
  id: string;
  matchDate: Date;
  opponent: string | null;
  runs: number | null;
  ballsFaced: number | null;
  dismissal: string | null;
  oversBowled: number | null;
  wickets: number | null;
  runsConceded: number | null;
};

export type GoalItem = {
  id: string;
  title: string;
  metric: string | null;
  target: number | null;
  horizonDate: Date | null;
  completedAt: Date | null;
};

export type ReminderItem = {
  id: string;
  text: string;
  dueAt: Date | null;
  completedAt: Date | null;
};

export type ProgressData = {
  entries: StatEntryItem[];
  goals: GoalItem[];
  reminders: ReminderItem[];
};

/** A player's logged matches, most recent first. */
export async function getStatEntries(playerId: string): Promise<StatEntryItem[]> {
  const rows = await prisma.statEntry.findMany({
    where: { playerId },
    orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      matchDate: true,
      opponent: true,
      runs: true,
      ballsFaced: true,
      dismissal: true,
      oversBowled: true,
      wickets: true,
      runsConceded: true,
    },
  });

  // Prisma returns Decimal instances for `oversBowled`; flatten to a plain
  // number so the value is safe to render and pass to chart helpers.
  return rows.map((row) => ({
    ...row,
    oversBowled: row.oversBowled === null ? null : Number(row.oversBowled),
  }));
}

/** A player's goals, unfinished first then most recently created. */
export async function getGoals(playerId: string): Promise<GoalItem[]> {
  const rows = await prisma.goal.findMany({
    where: { playerId },
    orderBy: [{ completedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      metric: true,
      target: true,
      horizonDate: true,
      completedAt: true,
    },
  });

  return rows.map((row) => ({
    ...row,
    target: row.target === null ? null : Number(row.target),
  }));
}

/** A player's reminders, unfinished first then by soonest due date. */
export async function getReminders(playerId: string): Promise<ReminderItem[]> {
  return prisma.reminder.findMany({
    where: { playerId },
    orderBy: [
      { completedAt: { sort: "asc", nulls: "first" } },
      { dueAt: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      text: true,
      dueAt: true,
      completedAt: true,
    },
  });
}

/** Everything the Progress page needs for a player, fetched in parallel. */
export async function getProgressData(playerId: string): Promise<ProgressData> {
  const [entries, goals, reminders] = await Promise.all([
    getStatEntries(playerId),
    getGoals(playerId),
    getReminders(playerId),
  ]);

  return { entries, goals, reminders };
}

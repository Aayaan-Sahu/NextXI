import { PlayerRole } from "@/app/generated/prisma/enums";

/** Human-readable labels for each player role, for form chips and badges. */
export const PLAYER_ROLE_LABELS: Record<PlayerRole, string> = {
  BATTER: "Batter",
  PACE: "Pace bowler",
  OFF_SPIN: "Off spin",
  LEG_SPIN: "Leg spin",
  WICKETKEEPER: "Wicketkeeper",
  ALL_ROUNDER: "All-rounder",
};

/** Player roles in display order, for rendering role pickers. */
export const PLAYER_ROLE_OPTIONS: { label: string; value: PlayerRole }[] = Object.values(
  PlayerRole,
).map((value) => ({ label: PLAYER_ROLE_LABELS[value], value }));

const PLAYER_ROLE_VALUES = new Set<string>(Object.values(PlayerRole));

export function isPlayerRole(value: unknown): value is PlayerRole {
  return typeof value === "string" && PLAYER_ROLE_VALUES.has(value);
}

/** Reads the `roles` checkboxes from a submitted form, de-duplicated and validated. */
export function parsePlayerRoles(formData: FormData): PlayerRole[] {
  const seen = new Set<PlayerRole>();
  for (const value of formData.getAll("roles")) {
    if (isPlayerRole(value)) seen.add(value);
  }
  return [...seen];
}

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

/** Countries selectable on a player profile, in display order, with flag emoji. */
export const COUNTRY_OPTIONS: { label: string; flag: string }[] = [
  { label: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { label: "Australia", flag: "🇦🇺" },
  { label: "India", flag: "🇮🇳" },
  { label: "Pakistan", flag: "🇵🇰" },
  { label: "New Zealand", flag: "🇳🇿" },
  { label: "South Africa", flag: "🇿🇦" },
  { label: "Sri Lanka", flag: "🇱🇰" },
  { label: "Bangladesh", flag: "🇧🇩" },
  { label: "West Indies", flag: "🏏" },
  { label: "Afghanistan", flag: "🇦🇫" },
  { label: "Ireland", flag: "🇮🇪" },
  { label: "Zimbabwe", flag: "🇿🇼" },
  { label: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { label: "Netherlands", flag: "🇳🇱" },
  { label: "United Arab Emirates", flag: "🇦🇪" },
  { label: "United States", flag: "🇺🇸" },
  { label: "Canada", flag: "🇨🇦" },
  { label: "Namibia", flag: "🇳🇦" },
  { label: "Nepal", flag: "🇳🇵" },
];

const COUNTRY_VALUES = new Set<string>(COUNTRY_OPTIONS.map((c) => c.label));

/** The default country selection, shown when a player has not chosen one yet. */
export const DEFAULT_COUNTRY = COUNTRY_OPTIONS[0].label;

export function isCountry(value: unknown): value is string {
  return typeof value === "string" && COUNTRY_VALUES.has(value);
}

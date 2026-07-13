import { CoachSpecialty } from "@/app/generated/prisma/enums";

/** Human-readable labels for each coaching specialty, for form chips and badges. */
export const COACH_SPECIALTY_LABELS: Record<CoachSpecialty, string> = {
  BATTING: "Batting",
  PACE_BOWLING: "Pace bowling",
  SPIN_BOWLING: "Spin bowling",
  WICKETKEEPING: "Wicketkeeping",
  FIELDING: "Fielding",
  FITNESS: "Fitness",
};

/** Coaching specialties in display order, for rendering specialty pickers. */
export const COACH_SPECIALTY_OPTIONS: { label: string; value: CoachSpecialty }[] = Object.values(
  CoachSpecialty,
).map((value) => ({ label: COACH_SPECIALTY_LABELS[value], value }));

const COACH_SPECIALTY_VALUES = new Set<string>(Object.values(CoachSpecialty));

export function isCoachSpecialty(value: unknown): value is CoachSpecialty {
  return typeof value === "string" && COACH_SPECIALTY_VALUES.has(value);
}

/** Reads the `specialties` checkboxes from a submitted form, de-duplicated and validated. */
export function parseCoachSpecialties(formData: FormData): CoachSpecialty[] {
  const seen = new Set<CoachSpecialty>();
  for (const value of formData.getAll("specialties")) {
    if (isCoachSpecialty(value)) seen.add(value);
  }
  return [...seen];
}

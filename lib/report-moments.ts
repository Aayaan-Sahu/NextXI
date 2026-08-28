import { formatTimestamp } from "@/lib/format-time";

/**
 * The moments a clip player can jump to, read straight from a report payload:
 * the swing peak of each detected shot (batting, schema v2 — and v3 payloads
 * that still carry `shots`), the three delivery events (bowling), and the
 * pipeline's own timeline notes (legacy v1). Pure; the page derives them and
 * hands the list to the client player.
 *
 * Shots are numbered by their position in the payload, exactly as the batting
 * report's rows are, so "Shot 2" on the rail and "Shot 2" in the report are
 * the same shot even when the report drops one for having nothing to say.
 */

export type Moment = { label: string; t: number };

/** Two moments closer than a frame at 60 fps are one moment. */
const FRAME_EPSILON = 1 / 60;
const NOTE_LABEL_LENGTH = 40;

const BOWLING_EVENTS = [
  ["back_foot_landing_time_sec", "Back-foot landing"],
  ["front_foot_landing_time_sec", "Front-foot landing"],
  ["release_time_sec", "Release"],
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function section(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return isRecord(value) ? value : {};
}

/** The clip's frame rate as the worker measured it; null hides frame-stepping. */
export function deriveVideoFps(payload: unknown): number | null {
  if (!isRecord(payload)) return null;
  const fps = num(section(payload, "video").fps);
  return fps !== null && fps > 0 ? fps : null;
}

/** The legacy v1 `annotations[]` — a timestamp and a note each. */
export function readAnnotations(payload: unknown): { timestamp_s: number; note: string }[] {
  if (!isRecord(payload) || !Array.isArray(payload.annotations)) return [];
  return payload.annotations.flatMap((item) => {
    if (!isRecord(item)) return [];
    const { timestamp_s, note } = item;
    if (typeof timestamp_s !== "number" || !Number.isFinite(timestamp_s) || typeof note !== "string") {
      return [];
    }
    return [{ timestamp_s, note }];
  });
}

function clipLabel(note: string): string {
  const trimmed = note.trim();
  return trimmed.length > NOTE_LABEL_LENGTH ? `${trimmed.slice(0, NOTE_LABEL_LENGTH - 1).trimEnd()}…` : trimmed;
}

export function deriveMoments(payload: unknown): Moment[] {
  if (!isRecord(payload)) return [];
  const found: Moment[] = [];

  const fps = deriveVideoFps(payload);
  if (fps !== null && Array.isArray(payload.shots)) {
    payload.shots.forEach((raw, index) => {
      if (!isRecord(raw)) return;
      const peak = num(section(raw, "frames").swing_peak);
      if (peak === null) return;
      found.push({ label: `Shot ${index + 1}`, t: peak / fps });
    });
  }

  if (isRecord(payload.delivery)) {
    const events = section(payload.delivery, "events");
    for (const [key, label] of BOWLING_EVENTS) {
      const t = num(events[key]);
      if (t !== null) found.push({ label, t });
    }
  }

  for (const { timestamp_s, note } of readAnnotations(payload)) {
    found.push({ label: clipLabel(note) || formatTimestamp(timestamp_s), t: timestamp_s });
  }

  const ordered = found
    .filter((moment) => Number.isFinite(moment.t) && moment.t >= 0)
    .sort((a, b) => a.t - b.t);
  return ordered.filter(
    (moment, index) => index === 0 || moment.t - ordered[index - 1].t >= FRAME_EPSILON,
  );
}

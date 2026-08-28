/**
 * Clip-time and relative-time formatting shared by the report renderers, the
 * comment thread and the clip player. Pure, so client components can use it.
 */

/**
 * A clip position as `m:ss` (floored, the way the report rows have always
 * read it). With `tenths`, `m:ss.t` — the paused readout and the frame-step
 * words need the fraction to show that anything moved.
 */
export function formatTimestamp(seconds: number, options: { tenths?: boolean } = {}): string {
  const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const whole = Math.floor(clamped);
  const base = `${Math.floor(whole / 60)}:${(whole % 60).toString().padStart(2, "0")}`;
  if (!options.tenths) return base;
  return `${base}.${Math.floor((clamped - whole) * 10)}`;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "3 hours ago", "2 days ago", "just now" — for feeds and queues. */
export function relativeTime(date: Date, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  for (const [unit, size] of RELATIVE_UNITS) {
    if (seconds >= size) {
      return new Intl.RelativeTimeFormat("en").format(-Math.floor(seconds / size), unit);
    }
  }
  return "just now";
}

/** A `?t=` deep link into a clip: finite, non-negative seconds, else nothing. */
export function parseClipTime(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

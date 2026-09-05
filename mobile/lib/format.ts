/** Compressed relative time for a list row: "2m", "5h", "3d", then a short date. */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "24 Aug" — a short absolute date for clip cards. */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "2:04 pm" — a message bubble's timestamp. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "Today · 2:04 pm" / "Yesterday · 2:04 pm" / "Thu, 9 Jul · 2:04 pm" — a thread's centered day/gap divider. */
export function formatDayDivider(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const dayNumber = (d: Date) => Math.floor(d.getTime() / 86_400_000) - d.getTimezoneOffset() / 1440;
  const diffDays = dayNumber(now) - dayNumber(date);

  const day = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", weekday: "short" });
  return `${day} · ${formatTime(iso)}`;
}

/** Whether two messages are far enough apart in time to need a divider between them. */
export function needsDivider(current: string, previous?: string): boolean {
  if (!previous) return true;
  return new Date(current).getTime() - new Date(previous).getTime() > 15 * 60_000;
}

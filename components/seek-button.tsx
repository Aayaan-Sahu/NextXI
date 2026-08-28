"use client";

import { useIsAtTime, useVideoTimeStore } from "@/components/video-time";
import { formatTimestamp } from "@/lib/format-time";

/**
 * A clip timestamp that jumps the page's player to it. Outside a
 * VideoTimeProvider (the player home, anywhere with no video mounted) it is
 * the quiet `m:ss` text the report rows have always shown — so the same
 * server component works on every page.
 *
 * Active means the clip sits at this moment: ink text under the amber inset
 * rule the nav and Tabs use for "you are here". `aria-current="time"` rather
 * than `aria-pressed` — seeking is a go-to, not a toggle.
 */
export function SeekButton({
  t,
  label,
  size = "caption",
  className = "",
}: {
  t: number;
  /** "Shot 1", "Release" — shown before the time, on the rail. */
  label?: string;
  /** `caption` inside report rows and comment meta; `ui` on the moments rail. */
  size?: "caption" | "ui";
  className?: string;
}) {
  const store = useVideoTimeStore();
  const active = useIsAtTime(store ? t : null);
  const time = formatTimestamp(t);
  const sizeClass = size === "ui" ? "text-ui" : "text-caption";

  if (!store) {
    return (
      <span className={`${sizeClass} text-ink-600 tabular-nums ${className}`}>
        {label ? `${label} · ${time}` : time}
      </span>
    );
  }

  return (
    <button
      aria-current={active ? "time" : undefined}
      aria-label={`Go to ${label ? `${label} at ${time}` : time}`}
      className={`${sizeClass} cursor-pointer rounded-sm font-semibold tabular-nums ${
        active
          ? "text-ink-900 shadow-[inset_0_-2px_0_var(--color-amber-500)]"
          : "text-rust-600 hover:text-rust-700 hover:underline"
      } ${size === "ui" ? "py-1.5 pointer-coarse:min-h-11" : ""} ${className}`}
      onClick={() => store.seek(t)}
      type="button"
    >
      {label ? (
        <>
          {label}
          <span className="ml-1.5 font-normal text-ink-600">{time}</span>
        </>
      ) : (
        time
      )}
    </button>
  );
}

"use client";

import { useState } from "react";
import { Switch } from "@/components/ui";
import { useVideoTime } from "@/components/video-time";
import { formatTimestamp } from "@/lib/format-time";

/**
 * "Pin to 0:04" for the feedback composer: a switch that captures the clip's
 * current position when turned on and submits it as `name` (a checked
 * checkbox sends its `value`; off sends nothing — the Switch contract). Read
 * live until pinned, so the coach can scrub to the moment first. Renders
 * nothing until the clip's metadata has loaded, and nothing at all on a page
 * with no player.
 */
export function TimestampField({ name = "timestampSec" }: { name?: string }) {
  const { time, duration } = useVideoTime();
  const [pinned, setPinned] = useState<number | null>(null);

  if (duration === null) return null;

  return (
    <Switch
      checked={pinned !== null}
      name={name}
      offLabel={`Pin to ${formatTimestamp(time)}`}
      onChange={(event) => setPinned(event.target.checked ? Math.round(time * 10) / 10 : null)}
      onLabel={pinned === null ? undefined : `Pinned at ${formatTimestamp(pinned)}`}
      value={pinned ?? ""}
    />
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const DEFAULT_INTERVAL_MS = 10_000;
/** Stop polling after this long — an abandoned tab shouldn't refresh forever. */
const MAX_POLL_MS = 30 * 60_000;

/**
 * Invisible poller mounted while a coaching report is pending, processing or
 * with the player's coach: refreshes the server components so the delivered
 * (or approved) report appears without a manual reload. Renders nothing.
 * The default cadence suits the pipeline's minutes; a coach's review takes
 * hours, so those surfaces pass a slower one.
 */
export function ReportAutoRefresh({ intervalMs = DEFAULT_INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - startedAt >= MAX_POLL_MS) {
        clearInterval(interval);
        return;
      }
      router.refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, router]);

  return null;
}

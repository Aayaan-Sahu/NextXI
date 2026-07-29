"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 10_000;
/** Stop polling after this long — an abandoned tab shouldn't refresh forever. */
const MAX_POLL_MS = 30 * 60_000;

/**
 * Invisible poller mounted while a coaching report is pending or processing:
 * refreshes the server components every 10s so the delivered report appears
 * without a manual reload. Renders nothing.
 */
export function ReportAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - startedAt >= MAX_POLL_MS) {
        clearInterval(interval);
        return;
      }
      router.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}

"use client";

import { useSyncExternalStore } from "react";

const SCRUB_BLOCKERS = "(pointer: coarse), (prefers-reduced-motion: reduce)";

function subscribeToScrubBlockers(onChange: () => void) {
  const query = window.matchMedia(SCRUB_BLOCKERS);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Whether the pinned hero scenes scrub on scroll; false on coarse pointers /
 * reduced motion, where the video autoplays instead. Shared by BallHero and
 * HeroScrubVideo so their handoff choreography stays in the same branch:
 * the ball's depart blackout only makes sense when the video section tucks
 * underneath it, which only happens in scrub mode.
 */
export function useCanScrub() {
  return useSyncExternalStore(
    subscribeToScrubBlockers,
    () => !window.matchMedia(SCRUB_BLOCKERS).matches,
    () => true,
  );
}

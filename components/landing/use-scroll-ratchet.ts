"use client";

import {
  useMotionValue,
  useMotionValueEvent,
  type MotionValue,
} from "motion/react";

/**
 * Follows `progress` upward but never back down, so scroll-driven reveals
 * stay revealed once the user has reached them.
 */
export function useScrollRatchet(progress: MotionValue<number>) {
  const max = useMotionValue(progress.get());

  useMotionValueEvent(progress, "change", (p) => {
    if (p > max.get()) max.set(p);
  });

  return max;
}

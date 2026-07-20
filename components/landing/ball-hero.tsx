"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Wordmark } from "@/components/ui";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const BallCanvas = dynamic(() => import("@/components/landing/ball-canvas"), {
  ssr: false,
});

/**
 * Pinned opener: the wordmark and headline sit front and center from the
 * first frame while the ball spins on Y and grows toward the camera as you
 * scroll down into the rest of the page.
 */
export function BallHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion() ?? false;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  // Subscribe rather than bind a transform: the raw scroll value updates
  // outside React, and a state flip + CSS transition fades reliably.
  const [cueHidden, setCueHidden] = useState(false);
  // "The delivery": in the final stretch the ball launches into the camera,
  // a leather-red vignette closes over the frame, and the video section
  // (pinned underneath via its negative top margin) emerges from the same
  // vignette. `depart` blinks this layer out right at the handoff so the
  // departing section never slides over the pinned video.
  const wipe = useMotionValue(0);
  const depart = useMotionValue(1);
  const wordmarkOpacity = useTransform(wipe, [0, 0.5], [1, 0]);
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    setCueHidden(progress > 0.08);
    depart.set(1 - clamp01((progress - 0.985) / 0.013));
    if (!reduced) wipe.set(clamp01((progress - 0.86) / 0.12));
  });

  return (
    <section ref={sectionRef} className="relative z-10 h-[250vh]">
      <motion.div style={{ opacity: depart }} className="sticky top-0 h-dvh overflow-hidden bg-pitch-950">
        <div className="absolute inset-0">
          <BallCanvas progress={scrollYProgress} reduced={reduced} />
        </div>

        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center"
        >
          <motion.span
            style={{ opacity: wordmarkOpacity }}
            className="flex flex-col items-center gap-5"
          >
            <Wordmark size="lg" tone="dark" />
            <span className="max-w-6xl font-display text-5xl leading-[1.02] font-bold tracking-[.02em] text-cream-100 uppercase sm:text-7xl lg:text-8xl">
              Cricket talent, <span className="text-gold-500">seen properly</span>
            </span>
          </motion.span>
        </motion.h1>

        <motion.div
          aria-hidden
          style={{ opacity: wipe }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_45%,rgba(90,20,18,0.78)_0%,rgba(58,15,15,0.94)_60%,#2c0b0b_100%)]"
        />

        <p
          className={`pointer-events-none absolute inset-x-0 bottom-8 text-center font-mono text-[11px] font-semibold tracking-[.3em] text-sage-400 uppercase transition-opacity duration-500 ${
            cueHidden ? "opacity-0" : "opacity-100"
          }`}
        >
          Scroll
        </p>
      </motion.div>
    </section>
  );
}

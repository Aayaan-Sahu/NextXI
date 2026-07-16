"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { Wordmark } from "@/components/ui";

const BallCanvas = dynamic(() => import("@/components/landing/ball-canvas"), {
  ssr: false,
});

/**
 * Pinned opener: the wordmark sits front and center from the first frame
 * while the ball spins on Y and grows toward the camera as you scroll down
 * into the rest of the page.
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
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    setCueHidden(progress > 0.08);
  });

  return (
    <section ref={sectionRef} className="relative h-[250vh] bg-pitch-950">
      <div className="sticky top-0 h-dvh overflow-hidden">
        <div className="absolute inset-0">
          <BallCanvas progress={scrollYProgress} reduced={reduced} />
        </div>

        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <Wordmark size="xl" tone="dark" />
        </motion.h1>

        <p
          className={`pointer-events-none absolute inset-x-0 bottom-8 text-center font-mono text-[11px] font-semibold tracking-[.3em] text-sage-400 uppercase transition-opacity duration-500 ${
            cueHidden ? "opacity-0" : "opacity-100"
          }`}
        >
          Scroll
        </p>
      </div>
    </section>
  );
}

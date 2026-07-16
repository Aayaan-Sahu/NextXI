"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Wordmark } from "@/components/ui";
import { useScrollRatchet } from "@/components/landing/use-scroll-ratchet";

const BallCanvas = dynamic(() => import("@/components/landing/ball-canvas"), {
  ssr: false,
});

/**
 * Pinned finale: the ball spins on Y and grows toward the camera as you
 * scroll, then the NextXI wordmark and CTA fade in over it.
 */
export function BallFinale() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion() ?? false;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  // Once the wordmark has revealed it stays, even scrolling back up.
  const ratchet = useScrollRatchet(scrollYProgress);
  const revealOpacity = useTransform(ratchet, [0.55, 0.8], [0, 1]);
  const revealY = useTransform(ratchet, [0.55, 0.8], [24, 0]);

  return (
    <section ref={sectionRef} className="relative h-[250vh] bg-pitch-950">
      <div className="sticky top-0 h-dvh overflow-hidden">
        <div className="absolute inset-0">
          <BallCanvas progress={scrollYProgress} reduced={reduced} />
        </div>

        <motion.div
          style={reduced ? undefined : { opacity: revealOpacity, y: revealY }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <Wordmark size="lg" tone="dark" />
        </motion.div>
      </div>
    </section>
  );
}

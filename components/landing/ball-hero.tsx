"use client";

import { useCallback, useRef, useState } from "react";
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
import { useCanScrub } from "@/components/landing/use-can-scrub";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const BallCanvas = dynamic(() => import("@/components/landing/ball-canvas"), {
  ssr: false,
});

/**
 * Pinned opener: the big NEXTXI wordmark sits front and center from the first
 * frame, then disappears as the ball spins on Y and grows toward the camera,
 * with the "Cricket talent, seen properly" tagline rising up in its place.
 *
 * The ball is a 3D canvas behind that wordmark, and it cannot draw until the
 * r3f bundle and the model have both landed. It used to snap in at full
 * opacity whenever that finished, which read as "the heavy thing has loaded".
 * Now it waits for two things — the first painted frame *and* the wordmark's
 * own entrance finishing — and then rises in over 0.7s. Waiting for the
 * wordmark is the part that matters: it means there is always a deliberate
 * beat before the ball appears, so a fast connection reads as choreography
 * rather than a race the ball happened to win.
 */
export function BallHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion() ?? false;
  const scrub = useCanScrub();
  const [ballPainted, setBallPainted] = useState(false);
  const [wordmarkLanded, setWordmarkLanded] = useState(false);
  const onBallReady = useCallback(() => setBallPainted(true), []);
  // Under reduced motion the wordmark renders with `initial={false}` and never
  // animates, so onAnimationComplete cannot be relied on to fire — treat the
  // beat as already spent rather than waiting for a signal that isn't coming.
  const ballVisible = ballPainted && (wordmarkLanded || reduced);

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
  // departing section never slides over the pinned video. That tuck only
  // exists in scrub mode — on coarse pointers / reduced motion the video
  // section sits in normal flow, so blanking here would expose the cream
  // page body for a full viewport of scroll. Keep the layer solid and let
  // pitch-950 hand off to the video's pitch-950 directly.
  const wipe = useMotionValue(0);
  const depart = useMotionValue(1);
  // The big wordmark opens the frame, then disappears as the ball grows and the
  // "Cricket talent, seen properly" tagline rises up in its place; the tagline
  // then clears again before the delivery's red wipe.
  // Keyframes span the full [0,1] and hold — an open-ended scroll range drifts
  // back over the pin's tail (the wordmark would ghost back in behind the tagline).
  // The wordmark holds crisp, then clears quickly near the top so there's no
  // half-faded logo lingering as a transparent ghost; the tagline rises after.
  const wordmarkOpacity = useTransform(scrollYProgress, [0, 0.06, 0.1, 1], [1, 1, 0, 0]);
  const taglineOpacity = useTransform(
    scrollYProgress,
    [0, 0.14, 0.3, 0.84, 0.93, 1],
    [0, 0, 1, 1, 0, 0],
  );
  const taglineY = useTransform(scrollYProgress, [0, 0.14, 0.3, 1], [30, 30, 0, 0]);
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    setCueHidden(progress > 0.08);
    depart.set(scrub ? 1 - clamp01((progress - 0.985) / 0.013) : 1);
    if (!reduced) wipe.set(clamp01((progress - 0.86) / 0.12));
  });

  return (
    // No background on the tall section itself: at z-10 its lower 100vh
    // overlaps the video (which tucks under via -mt-[100vh]), so a solid bg
    // here would paint over the video during the hand-off — the black screen.
    // The pinned video's own sticky layer carries the dark ground instead.
    <section ref={sectionRef} className="relative z-10 h-[250vh]">
      <motion.div style={{ opacity: depart }} className="sticky top-0 h-dvh overflow-hidden bg-pitch-950">
        {/* The entrance is a wrapper transform, not a 3D one: the canvas runs
            a demand-driven frameloop, so animating the ball's own scale would
            need an invalidate() every frame. Scaling the already-drawn frame
            costs nothing and reads the same. */}
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{
            opacity: ballVisible ? 1 : 0,
            scale: ballVisible || reduced ? 1 : 0.94,
          }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
          }
        >
          <BallCanvas progress={scrollYProgress} reduced={reduced} onReady={onBallReady} />
        </motion.div>

        {/* The big wordmark opens the frame and disappears as you scroll; the
            huge tagline rises up in its place, then clears at the delivery. Both
            are absolutely centred so they cross-fade over the same spot. */}
        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          onAnimationComplete={() => setWordmarkLanded(true)}
          className="pointer-events-none absolute inset-0"
        >
          <motion.span
            style={{ opacity: wordmarkOpacity }}
            className="absolute inset-0 flex items-center justify-center px-6"
          >
            <Wordmark accent="peach" size="2xl" tone="dark" />
          </motion.span>
          <motion.span
            style={{ opacity: taglineOpacity, y: taglineY }}
            className="absolute inset-0 flex items-center justify-center px-6 text-center font-display text-5xl leading-[1.02] font-bold tracking-[.02em] text-cream-100 text-shadow-display uppercase sm:text-7xl lg:text-8xl"
          >
            <span className="max-w-6xl">
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
          className={`pointer-events-none absolute inset-x-0 bottom-8 text-center text-caption font-semibold tracking-[.16em] text-cream-200/70 uppercase transition-opacity duration-500 ${
            cueHidden ? "opacity-0" : "opacity-100"
          }`}
        >
          Scroll
        </p>
      </motion.div>
    </section>
  );
}

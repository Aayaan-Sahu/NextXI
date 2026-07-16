"use client";

import { useRef, useSyncExternalStore } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { AnalysisHud } from "@/components/landing/analysis-hud";
import { useScrollRatchet } from "@/components/landing/use-scroll-ratchet";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const SCRUB_BLOCKERS = "(pointer: coarse), (prefers-reduced-motion: reduce)";

function subscribeToScrubBlockers(onChange: () => void) {
  const query = window.matchMedia(SCRUB_BLOCKERS);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether to scrub on scroll; false on coarse pointers / reduced motion. */
function useCanScrub() {
  return useSyncExternalStore(
    subscribeToScrubBlockers,
    () => !window.matchMedia(SCRUB_BLOCKERS).matches,
    () => true,
  );
}

/**
 * Pinned hero: scrolling through the tall section scrubs the analysis video.
 * On coarse pointers / reduced motion the video simply autoplays instead —
 * frame-accurate seeking is too janky on mobile to be worth it.
 */
export function HeroScrubVideo({ src, poster }: { src: string; poster: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrub = useCanScrub();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  // Reveal the headline only once the video has (almost) played out — and
  // keep it revealed if the user scrolls back up.
  const ratchet = useScrollRatchet(scrollYProgress);
  const revealOpacity = useTransform(ratchet, [0.82, 0.97], [0, 1]);
  const revealY = useTransform(ratchet, [0.82, 0.97], [32, 0]);

  useMotionValueEvent(smooth, "change", (progress) => {
    const video = videoRef.current;
    if (!scrub || !video || !Number.isFinite(video.duration)) return;
    const time = progress * video.duration;
    if (Math.abs(time - video.currentTime) > 1 / 30) {
      video.currentTime = time;
    }
  });

  // Hand-off from the ball section's red wipe: the frame starts leather-red
  // and the batter fades in over the first few percent of the scrub.
  const entry = useMotionValue(scrub ? 1 : 0);
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (scrub) entry.set(1 - clamp01(progress / 0.07));
  });

  return (
    <section ref={sectionRef} className={scrub ? "relative h-[350vh]" : "relative"}>
      <div
        className={`flex flex-col justify-center overflow-hidden bg-pitch-950 ${
          scrub ? "sticky top-0 h-dvh" : "h-dvh"
        }`}
      >
        <video
          key={scrub ? "scrub" : "loop"}
          ref={videoRef}
          src={src}
          poster={poster}
          preload="auto"
          muted
          playsInline
          autoPlay={!scrub}
          loop={!scrub}
          className="h-full w-full object-contain"
        />

        <AnalysisHud progress={scrollYProgress} scrub={scrub} />

        <motion.div
          style={scrub ? { opacity: revealOpacity, y: revealY } : undefined}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-pitch-950/55 px-6 text-center"
        >
          <h2 className="max-w-5xl font-display text-5xl leading-[1.02] font-bold tracking-[.02em] text-cream-100 uppercase sm:text-7xl lg:text-8xl">
            See your game like a scout does
          </h2>
        </motion.div>

        {scrub ? (
          <motion.div
            aria-hidden
            style={{ opacity: entry }}
            className="pointer-events-none absolute inset-0 bg-rust-700"
          />
        ) : (
          <motion.div
            aria-hidden
            initial={{ opacity: 1 }}
            whileInView={{ opacity: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 bg-rust-700"
          />
        )}
      </div>
    </section>
  );
}

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
  // Once the pin clamps at either edge the video is fully hidden (red wipe /
  // headline), so snap the spring there — letting it drain would keep issuing
  // backward seeks that fight the ball canvas for the GPU during the handoff.
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (progress === 0 || progress === 1) smooth.jump(progress);
  });
  // Reveal the headline only once the video has (almost) played out; scrolling
  // back up plays the same reveal in reverse.
  const revealOpacity = useTransform(scrollYProgress, [0.82, 0.97], [0, 1]);
  const revealY = useTransform(scrollYProgress, [0.82, 0.97], [32, 0]);

  useMotionValueEvent(smooth, "change", (progress) => {
    const video = videoRef.current;
    if (!scrub || !video || !Number.isFinite(video.duration)) return;
    const time = progress * video.duration;
    if (Math.abs(time - video.currentTime) > 1 / 30) {
      video.currentTime = time;
    }
  });

  // Hand-off from the ball section's red wipe: the frame starts inside the
  // same leather-red vignette and the batter emerges over the first few
  // percent of the scrub.
  const entry = useMotionValue(scrub ? 1 : 0);
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (scrub) entry.set(1 - clamp01(progress / 0.05));
  });

  return (
    // In scrub mode the section tucks under the ball opener's final viewport
    // (-mt-[100vh], lower z): its pin starts the instant the ball unpins, so
    // there is no dead scroll between the two pinned scenes.
    <section
      ref={sectionRef}
      className={scrub ? "relative z-0 -mt-[100vh] h-[350vh]" : "relative"}
    >
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

        <AnalysisHud progress={scrollYProgress} scrub={scrub} videoRef={videoRef} />

        {/* Scrim + headline: scroll-driven in scrub mode (fades in as the video
            plays out). In autoplay mode the headline gets a beat once the red
            vignette clears, then the whole overlay fades so the visitor can
            watch the play un-dimmed — the tracked events start ~5.5s in. The
            h2 stays in the DOM at opacity 0, matching scrub mode. */}
        <motion.div
          style={scrub ? { opacity: revealOpacity, y: revealY } : undefined}
          initial={scrub ? undefined : { opacity: 1 }}
          whileInView={scrub ? undefined : { opacity: 0 }}
          viewport={scrub ? undefined : { once: true, amount: 0.4 }}
          transition={scrub ? undefined : { delay: 2.2, duration: 0.9, ease: "easeOut" }}
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
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_45%,rgba(90,20,18,0.78)_0%,rgba(58,15,15,0.94)_60%,#2c0b0b_100%)]"
          />
        ) : (
          <motion.div
            aria-hidden
            initial={{ opacity: 1 }}
            whileInView={{ opacity: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_45%,rgba(90,20,18,0.78)_0%,rgba(58,15,15,0.94)_60%,#2c0b0b_100%)]"
          />
        )}
      </div>
    </section>
  );
}

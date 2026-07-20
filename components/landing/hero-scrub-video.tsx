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
import { ScoutReportCard } from "@/components/landing/scout-report-card";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// The video scrub completes at this fraction of the pin; the remainder of the
// scroll drives the headline → report-card handoff.
const VIDEO_END = 0.62;

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
  // The video only scrubs over the first VIDEO_END of the pin, so everything
  // video-relative (seek, HUD, entry wipe) reads this remapped value.
  const videoProgress = useTransform(scrollYProgress, (p) => clamp01(p / VIDEO_END));
  const smooth = useSpring(videoProgress, { stiffness: 120, damping: 30 });
  // Once the video timeline clamps at either edge it is fully hidden (red wipe
  // / headline), so snap the spring there — letting it drain would keep issuing
  // backward seeks that fight the ball canvas for the GPU during the handoff.
  useMotionValueEvent(videoProgress, "change", (progress) => {
    if (progress === 0 || progress === 1) smooth.jump(progress);
  });
  // Beat 1: the headline rises once the video has (almost) played out, holds,
  // then gives the frame to the report card. Beat 2: the card fades in from
  // the bottom over exactly the window the headline fades out.
  // Opacity keyframes must span the full [0, 1] input range: Motion runs
  // scroll-linked opacity as an accelerated ScrollTimeline animation, and
  // WAAPI fills uncovered ends with an implicit keyframe from the mount-time
  // value — an open-ended range fades back out over the pin's tail.
  const dimOpacity = useTransform(scrollYProgress, [0, 0.52, 0.62, 1], [0, 0, 1, 1]);
  const revealOpacity = useTransform(
    scrollYProgress,
    [0, 0.52, 0.62, 0.7, 0.82, 1],
    [0, 0, 1, 1, 0, 0],
  );
  const revealY = useTransform(scrollYProgress, [0.52, 0.62, 0.7, 0.82], [32, 0, 0, -28]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.7, 0.82, 1], [0, 0, 1, 1]);
  const cardY = useTransform(scrollYProgress, [0.7, 0.84], ["60vh", "0vh"]);

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
  useMotionValueEvent(videoProgress, "change", (progress) => {
    if (scrub) entry.set(1 - clamp01(progress / 0.05));
  });

  return (
    // In scrub mode the section tucks under the ball opener's final viewport
    // (-mt-[100vh], lower z): its pin starts the instant the ball unpins, so
    // there is no dead scroll between the two pinned scenes.
    <section
      ref={sectionRef}
      className={scrub ? "relative z-0 -mt-[100vh] h-[500vh]" : "relative"}
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

        <AnalysisHud progress={videoProgress} scrub={scrub} videoRef={videoRef} />

        <motion.div
          aria-hidden
          style={scrub ? { opacity: dimOpacity } : undefined}
          className="pointer-events-none absolute inset-0 bg-pitch-950/55"
        />

        <motion.div
          style={scrub ? { opacity: revealOpacity, y: revealY } : undefined}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        >
          <h2 className="max-w-5xl font-display text-5xl leading-[1.02] font-bold tracking-[.02em] text-cream-100 uppercase sm:text-7xl lg:text-8xl">
            See your game like a scout does
          </h2>
          <p className="mt-6 font-mono text-[11px] font-semibold tracking-[.3em] text-sage-400 uppercase">
            Footage · Aryaman Varma · Professional cricketer
          </p>
        </motion.div>

        {scrub && (
          <motion.div
            style={{ opacity: cardOpacity, y: cardY }}
            className="pointer-events-none absolute inset-0 flex items-center"
          >
            <div className="mx-auto grid w-full max-w-[1280px] px-6 sm:px-12 lg:grid-cols-2">
              <div className="hidden lg:block" />
              <div className="w-full max-w-[480px] justify-self-center lg:justify-self-end">
                <ScoutReportCard />
              </div>
            </div>
          </motion.div>
        )}

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

      {/* Without the pinned scrub there is no scroll beat to ride, so the
          report card gets its own static section under the video. */}
      {!scrub && (
        <div className="bg-pitch-950 px-6 py-16 sm:px-12">
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="mx-auto w-full max-w-[480px]"
          >
            <ScoutReportCard />
          </motion.div>
        </div>
      )}
    </section>
  );
}

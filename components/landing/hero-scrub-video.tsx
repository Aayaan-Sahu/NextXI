"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { AnalysisHud } from "@/components/landing/analysis-hud";
import { VariantEditorial } from "@/components/landing/report-variants/variant-editorial";
import { useCanScrub } from "@/components/landing/use-can-scrub";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// The video scrub completes at this fraction of the pin; the rest of the
// scroll drives the headline → "video slides left, report reveals" handoff.
const VIDEO_END = 0.5;

/**
 * Pinned hero: scrolling scrubs the analysis video, then — in the SAME shot,
 * no second video — the headline rises, the video slides and shrinks to the
 * left, and its AI coaching report reveals line by line on the right while the
 * batter stays in view. On coarse pointers / reduced motion the video just
 * autoplays and the report sits under it.
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
  useMotionValueEvent(videoProgress, "change", (progress) => {
    if (progress === 0 || progress === 1) smooth.jump(progress);
  });

  useMotionValueEvent(smooth, "change", (progress) => {
    const video = videoRef.current;
    if (!scrub || !video || !Number.isFinite(video.duration)) return;
    const time = progress * video.duration;
    if (Math.abs(time - video.currentTime) > 1 / 30) {
      video.currentTime = time;
    }
  });

  // Hand-off from the ball section's red wipe: the frame starts inside the
  // same leather-red vignette and the batter emerges over the first few percent.
  const entry = useMotionValue(scrub ? 1 : 0);
  useMotionValueEvent(videoProgress, "change", (progress) => {
    if (scrub) entry.set(1 - clamp01(progress / 0.05));
  });

  // Headline rises after the scrub, holds, then clears as the split forms.
  // Keyframes span the full [0,1] input (Motion runs scroll-linked opacity as a
  // ScrollTimeline animation and fills open ends from the mount value).
  // All scroll-linked keyframes span the full [0,1] input and hold at their end
  // value — an open-ended range gets an implicit ScrollTimeline keyframe that
  // drifts it back over the pin's tail (the video would recentre, the report
  // fade out). See the reveal note in variant-editorial.
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.44, 0.52, 0.6, 0.66, 1], [0, 0, 1, 1, 0, 0]);
  const headlineY = useTransform(scrollYProgress, [0, 0.44, 0.52, 0.6, 0.66, 1], [32, 32, 0, 0, -28, -28]);
  // The video collapses from full-frame into a rounded panel (squircle) on the
  // left, sitting almost flush with the report. Animating the wrapper insets
  // (rather than a transform) lets the batter's 16:9 frame fill the panel
  // edge-to-edge. Tuned by screenshot.
  const videoLeft = useTransform(scrollYProgress, [0, 0.56, 0.72, 1], ["0%", "0%", "2.5%", "2.5%"]);
  const videoRight = useTransform(scrollYProgress, [0, 0.56, 0.72, 1], ["0%", "0%", "39.5%", "39.5%"]);
  const videoTop = useTransform(scrollYProgress, [0, 0.56, 0.72, 1], ["0%", "0%", "17.5%", "17.5%"]);
  const videoBottom = useTransform(scrollYProgress, [0, 0.56, 0.72, 1], ["0%", "0%", "17.5%", "17.5%"]);
  const videoRadius = useTransform(scrollYProgress, [0, 0.56, 0.72, 1], ["0px", "0px", "26px", "26px"]);
  // The report slides in on the right; its lines then reveal (in VariantEditorial,
  // driven by scrollYProgress over roughly [0.6, 0.99]).
  const reportOpacity = useTransform(scrollYProgress, [0, 0.6, 0.68, 1], [0, 0, 1, 1]);
  const reportX = useTransform(scrollYProgress, [0, 0.6, 0.68, 1], [48, 48, 0, 0]);

  return (
    // In scrub mode the section tucks under the ball opener's final viewport
    // (-mt-[100vh], lower z): its pin starts the instant the ball unpins.
    <section
      ref={sectionRef}
      className={scrub ? "relative z-0 -mt-[100vh] h-[600vh]" : "relative"}
    >
      <div
        className={`flex flex-col justify-center overflow-hidden bg-pitch-950 ${
          // Both branches must be a *positioned* box: the video/headline/wipe
          // layers inside are `absolute inset-0`, so they resolve to this box.
          // In scrub, `sticky` already positions it. In the fallback it must be
          // `relative` — otherwise `absolute inset-0` escapes to the section's
          // `relative` ancestor and the full-height video paints over the
          // report block below it (invisible report on phones).
          scrub ? "sticky top-0 h-dvh" : "relative h-dvh"
        }`}
      >
        {/* video + its HUD move together, collapsing into a rounded left panel */}
        <motion.div
          style={
            scrub
              ? {
                  left: videoLeft,
                  right: videoRight,
                  top: videoTop,
                  bottom: videoBottom,
                  borderRadius: videoRadius,
                }
              : undefined
          }
          className="absolute inset-0 overflow-hidden bg-pitch-950"
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
        </motion.div>

        {/* "See your game like a scout does" — scrub-only overlay that rises as
            the video scrubs, then clears as the split forms. Rendering it only in
            scrub avoids the SSR trap: useCanScrub's server snapshot is true, so a
            fallback visit would hydrate this overlay in the scrub state (opacity
            0) with no animation to bring it back — it would sit invisible. The
            fallback shows the same line as a static heading above the report. */}
        {scrub && (
          <motion.div
            style={{ opacity: headlineOpacity, y: headlineY }}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          >
            <h2 className="max-w-5xl font-display text-5xl leading-[1.02] font-bold tracking-[.02em] text-cream-100 uppercase [text-shadow:0_2px_28px_rgba(23,19,16,0.85)] sm:text-7xl lg:text-8xl">
              See your game like a scout does
            </h2>
            <p className="mt-6 font-mono text-[14px] font-semibold tracking-[.14em] text-cream-100 uppercase sm:text-base">
              Footage · Aryaman Varma · Professional cricketer
            </p>
          </motion.div>
        )}

        {/* report, right side, revealing line by line (scrub only) */}
        {scrub && (
          <div className="pointer-events-none absolute inset-y-0 right-[3%] flex w-[46%] max-w-[500px] items-center">
            <motion.div style={{ opacity: reportOpacity, x: reportX }} className="w-full">
              <VariantEditorial progress={scrollYProgress} />
            </motion.div>
          </div>
        )}

        {/* ball → video red hand-off */}
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

      {/* No pin to ride on touch: the "video → headline → report" story that
          scrubs on desktop is laid out vertically here — the analysis video,
          then the same headline as a static intro, then the report card. */}
      {!scrub && (
        <div className="bg-pitch-950 px-6 py-16 sm:px-12">
          <div className="mx-auto mb-12 max-w-[460px] text-center">
            <h2 className="font-display text-4xl leading-[1.04] font-bold tracking-[.02em] text-cream-100 uppercase sm:text-5xl">
              See your game like a scout does
            </h2>
            <p className="mt-4 font-mono text-[13px] font-semibold tracking-[.14em] text-cream-100 uppercase">
              Footage · Aryaman Varma · Professional cricketer
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="mx-auto w-full max-w-[460px]"
          >
            <VariantEditorial />
          </motion.div>
        </div>
      )}
    </section>
  );
}

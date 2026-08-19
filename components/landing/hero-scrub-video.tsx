"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { AnalysisHud } from "@/components/landing/analysis-hud";
import { VariantScoreboard } from "@/components/landing/report-variants/variant-scoreboard";
import { useCanScrub } from "@/components/landing/use-can-scrub";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// The card's stepped print: how much of the report column is unveiled at a
// given pin progress. Holds are the dwells between section steps (tiles at
// 0.72, focus at 0.78, coach stamp at 0.84) — all after SPLIT_END.
const PRINT_STOPS = [0, 0.72, 0.75, 0.78, 0.81, 0.84, 0.86, 1];
const PRINT_OPEN = [40, 40, 71, 71, 92, 92, 100, 100];

function piecewise(p: number, stops: number[], values: number[]) {
  if (p <= stops[0]) return values[0];
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i]) {
      const t = (p - stops[i - 1]) / (stops[i] - stops[i - 1]);
      return values[i - 1] + t * (values[i] - values[i - 1]);
    }
  }
  return values[values.length - 1];
}

/**
 * Scale the mock card down only when it would clip the viewport, origin at
 * the right so extra gap opens toward the batter instead of covering them.
 */
function PinFit({
  children,
  onScale,
}: {
  children: ReactNode;
  /** Reports the applied scale so the split can reclaim the width a shrunken card gives up. */
  onScale?: (scale: number) => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const fit = () => {
      const available = outer.clientHeight;
      const natural = inner.scrollHeight;
      if (available <= 0 || natural <= 0) return;
      const next = Math.min(1, available / natural);
      setScale(next);
      onScale?.(next);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [onScale]);

  return (
    <div ref={outerRef} className="flex h-full min-h-0 w-full items-center justify-end">
      <div
        className="w-full overflow-hidden"
        style={scale < 1 ? { height: "100%" } : undefined}
      >
        <div
          ref={innerRef}
          className="w-full"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top right",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// The video scrub completes at this fraction of the pin; the rest of the
// scroll drives the headline → "video slides left, report reveals" handoff.
// Keep the story packed toward the end of the pin so you don't sit on a
// frozen split for a couple of extra viewports before How it works.
const VIDEO_END = 0.55;
const SPLIT_START = 0.55;
// The split forms fully before the report starts printing (PRINT_STOPS run
// 0.72 → 0.86), so the row-by-row build happens on a settled stage instead of
// half-offscreen while the card is still riding in.
const SPLIT_END = 0.7;

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

  // Headline rises as the scrub finishes, then clears in the same beat the
  // video slides — one shot, no hold. Keyframes span [0,1] so ScrollTimeline
  // doesn't interpolate an open end back to the mount value (video recentres,
  // report fades out). See the reveal note in variant-editorial.
  const headlineOpacity = useTransform(
    scrollYProgress,
    [0, 0.46, 0.52, SPLIT_START, 0.7, 1],
    [0, 0, 1, 1, 0, 0],
  );
  const headlineY = useTransform(
    scrollYProgress,
    [0, 0.46, 0.52, SPLIT_START, 0.7, 1],
    [32, 32, 0, 0, -28, -28],
  );
  // Size the post-split panel to the 16:9 frame (object-contain in a tall
  // rounded rect just letterboxed into empty pitch). `right` reserves the
  // report column + a gap so the white card never covers the batter. The
  // reserve tracks PinFit's applied scale: when a short viewport shrinks the
  // card (toward its top-right anchor), the panel widens to absorb the freed
  // width instead of leaving a dead gap between video and report.
  const [cardScale, setCardScale] = useState(1);
  const cardReserve = `min(44%, 580px) * ${cardScale.toFixed(4)}`;
  const splitRight = `1.75% + ${cardReserve} + 1.5rem`;
  const splitVertical = `max(1.25rem, (100dvh - (100vw - 1.25vw - 1.75vw - min(44vw, 580px) * ${cardScale.toFixed(4)} - 1.5rem) * 9 / 16) / 2)`;
  // Keyframe strings containing min()/max() don't numerically interpolate
  // (motion hard-swaps them at the segment boundary, snapping the video
  // straight to its panel at SPLIT_START), so emit each frame's calc with an
  // animated multiplier instead.
  const splitT = (p: number) => clamp01((p - SPLIT_START) / (SPLIT_END - SPLIT_START));
  const videoLeft = useTransform(scrollYProgress, (p) => `${(splitT(p) * 1.25).toFixed(3)}%`);
  const videoRight = useTransform(scrollYProgress, (p) => `calc(${splitT(p).toFixed(4)} * (${splitRight}))`);
  const videoTop = useTransform(scrollYProgress, (p) => `calc(${splitT(p).toFixed(4)} * ${splitVertical})`);
  const videoBottom = useTransform(scrollYProgress, (p) => `calc(${splitT(p).toFixed(4)} * ${splitVertical})`);
  const videoRadius = useTransform(scrollYProgress, [0, SPLIT_START, SPLIT_END, 1], ["0px", "0px", "26px", "26px"]);
  // The card never fades in over the video — it rides the split: starting
  // just off the right viewport edge, its left edge tracks the video's right
  // edge at the constant 1.5rem gutter (the same inset expression, remaining
  // fraction), so the two panels form the split as one rigid motion and can
  // never overlap.
  const reportX = useTransform(scrollYProgress, (p) => {
    const r = 1 - splitT(p);
    return `calc(${r.toFixed(4)} * (1.75vw + min(44vw, 580px) * ${cardScale.toFixed(4)} + 1.5rem))`;
  });
  // The card arrives already showing its hero plate and session cells, then
  // extends downward in three decisive steps — tiles, focus, coach stamp —
  // like a broadcast scoreboard adding rows: hard edge, quick step, hold.
  // Section fades lead each step so a step only ever exposes painted card
  // (no white flash), and the crisp edge matches the site's mechanical
  // scroll language — a feathered sweep read hazy against it. (Function
  // transforms, not string keyframes — motion won't numerically mix these
  // inset() strings.)
  const openAt = (p: number) => piecewise(p, PRINT_STOPS, PRINT_OPEN);
  const reportClip = useTransform(
    scrollYProgress,
    (p) => `inset(-24px -24px ${(100 - openAt(p)).toFixed(2)}% -24px round 14px)`,
  );
  const printEdgeTop = useTransform(scrollYProgress, (p) => `${openAt(p).toFixed(2)}%`);
  const printEdgeOpacity = useTransform(scrollYProgress, [0.7, 0.72, 0.85, 0.88], [0, 1, 1, 0]);

  return (
    // In scrub mode the section tucks under the ball opener's final viewport
    // (-mt-[100vh], lower z): its pin starts the instant the ball unpins.
    <section
      ref={sectionRef}
      className={scrub ? "relative z-0 -mt-[100vh] h-[450vh]" : "relative"}
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

        {/* "AI-backed scouting for young cricketers" — scrub-only overlay that rises as
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
            <h2 className="max-w-5xl font-display text-4xl leading-[1.02] font-bold tracking-[.02em] text-cream-100 uppercase [text-shadow:0_2px_28px_rgba(23,19,16,0.85)] sm:text-6xl lg:text-8xl">
              AI-backed scouting for young cricketers
            </h2>
            <p className="mt-6 font-mono text-[14px] font-semibold tracking-[.14em] text-cream-100 uppercase sm:text-base">
              Footage · Aryaman Varma · Professional cricketer
            </p>
          </motion.div>
        )}

        {/* report, right side, revealing line by line (scrub only) */}
        {scrub && (
          <div className="pointer-events-none absolute inset-y-0 right-[1.75%] flex w-[44%] max-w-[580px] items-center py-6">
            <motion.div style={{ x: reportX }} className="relative h-full min-h-0 w-full">
              <motion.div style={{ clipPath: reportClip }} className="h-full min-h-0 w-full">
                <PinFit onScale={setCardScale}>
                  <VariantScoreboard progress={scrollYProgress} tone="light" />
                </PinFit>
              </motion.div>
              {/* gold scan line riding the print edge, spanning the scaled card only */}
              <motion.div
                aria-hidden
                style={{
                  top: printEdgeTop,
                  opacity: printEdgeOpacity,
                  width: `${(cardScale * 100).toFixed(2)}%`,
                }}
                className="absolute right-0 h-[2px] bg-gold-500/70"
              />
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
              AI-backed scouting for young cricketers
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
            className="mx-auto w-full max-w-[520px]"
          >
            <VariantScoreboard compact tone="light" />
          </motion.div>
        </div>
      )}
    </section>
  );
}

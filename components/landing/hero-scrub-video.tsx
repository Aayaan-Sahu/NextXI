"use client";

import { useLayoutEffect, useRef, useState } from "react";
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

// Breathing room the pinned card keeps above and below itself.
const PIN_MARGIN = 36;

// The settled split: the video panel's left inset and the share of the
// viewport it leaves to the card on the right. The card column (below) is
// sized so its left edge lands a gutter past the panel's right edge.
const SPLIT_RIGHT = 0.41;
// Vertical inset that makes the settled panel exactly 16:9, so the batter
// fills it edge to edge with no letterbox:
//   panel width  = (1 - 0.025 - SPLIT_RIGHT) * 100vw
//   panel height = width * 9/16
//   inset        = (100vh - height) / 2
// max(0px, …) keeps the panel inside the viewport on ultra-wide screens.
const SPLIT_INSET_Y = `max(0px, 50% - ${(((1 - 0.025 - SPLIT_RIGHT) * 9) / 16 / 2) * 100}vw)`;

/**
 * Scales the report card down (never up) so its natural height fits the pinned
 * viewport with PIN_MARGIN to spare. The scoreboard card is taller than a
 * pinned viewport on most laptops; shrinking it in place beats dropping rows.
 * Origin is left-centre so the gutter to the video never widens — the card
 * gives back space on its outer edge instead.
 */
function PinFit({ children }: { children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const card = cardRef.current;
    if (!box || !card) return;
    const fit = () => {
      // offsetHeight ignores the transform, so this is the natural height.
      const available = box.clientHeight - PIN_MARGIN * 2;
      const natural = card.offsetHeight;
      setScale(natural > 0 ? Math.min(1, available / natural) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    ro.observe(card);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="flex h-full w-full items-center">
      <div
        ref={cardRef}
        className="w-full"
        style={{ transform: `scale(${scale})`, transformOrigin: "left center" }}
      >
        {children}
      </div>
    </div>
  );
}

// The video scrub completes at this fraction of the pin; the rest of the
// scroll drives the headline → "video slides left, report reveals" handoff.
const VIDEO_END = 0.5;

// The replay. Once the report card is in, the footage cuts back to the
// trigger and re-plays the shot's key second under the scroll, holding on the
// moments the score rows describe as they land (see variant-scoreboard's
// reveal schedule and AnalysisHud's callouts): downswing start for the front
// elbow, the downswing itself for the bat path, the follow-through for head
// travel. Times are seconds into the 14 s clip.
const REPLAY_CUT = 0.68;
const REPLAY_STOPS = [0.68, 0.71, 0.745, 0.775, 0.815, 0.85];
const REPLAY_TIMES = [5.5, 5.5, 6.05, 6.05, 6.72, 7.3];
const CLIP_S = 14;

function piecewise(stops: number[], values: number[], x: number) {
  if (x <= stops[0]) return values[0];
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i]) {
      const k = (x - stops[i - 1]) / (stops[i] - stops[i - 1]);
      return values[i - 1] + (values[i] - values[i - 1]) * k;
    }
  }
  return values[values.length - 1];
}

/** Where the playhead sits (as a fraction of the clip) for a pin progress. */
function seekFractionAt(p: number) {
  if (p < REPLAY_CUT) return clamp01(p / VIDEO_END);
  return piecewise(REPLAY_STOPS, REPLAY_TIMES, p) / CLIP_S;
}

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
  // The playhead: the scrub, then the replay. Springs for feel, except at the
  // ends and across the replay's cut, which must be a cut — a spring there
  // would rewind through eight seconds of footage in a blur.
  const seek = useTransform(scrollYProgress, seekFractionAt);
  const smooth = useSpring(seek, { stiffness: 120, damping: 30 });
  useMotionValueEvent(seek, "change", (fraction) => {
    if (fraction === 0 || fraction === 1 || Math.abs(fraction - smooth.get()) > 0.2) {
      smooth.jump(fraction);
    }
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
  const videoRight = useTransform(scrollYProgress, [0, 0.56, 0.72, 1], ["0%", "0%", `${SPLIT_RIGHT * 100}%`, `${SPLIT_RIGHT * 100}%`]);
  // The vertical inset is a calc() of vh and vw, which Motion cannot
  // interpolate as a keyframe string — so it is built per frame from a
  // numeric 0→1 multiplier on the same schedule as the horizontal insets.
  const splitY = useTransform(scrollYProgress, [0, 0.56, 0.72, 1], [0, 0, 1, 1]);
  const videoTop = useTransform(splitY, (m) => `calc(${m} * ${SPLIT_INSET_Y})`);
  const videoBottom = videoTop;
  const videoRadius = useTransform(scrollYProgress, [0, 0.56, 0.72, 1], ["0px", "0px", "26px", "26px"]);
  // The report slides in on the right; its blocks then reveal (in
  // VariantScoreboard, driven by scrollYProgress over roughly [0.62, 0.93]).
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
          <AnalysisHud
            progress={videoProgress}
            scrub={scrub}
            story={scrub ? scrollYProgress : undefined}
            videoRef={videoRef}
          />
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
            <h2 className="max-w-5xl font-display text-4xl leading-[1.02] font-bold tracking-[.02em] text-cream-100 text-shadow-display uppercase sm:text-6xl lg:text-8xl">
              AI-backed scouting for young cricketers
            </h2>
            <p className="mt-6 text-caption font-semibold tracking-[.16em] text-cream-200 uppercase">
              Footage · Aryaman Varma · Professional cricketer
            </p>
          </motion.div>
        )}

        {/* report, right side, revealing block by block (scrub only) */}
        {scrub && (
          <div className="pointer-events-none absolute inset-y-0 right-[3%] flex w-[36%] max-w-[520px] items-center">
            <motion.div style={{ opacity: reportOpacity, x: reportX }} className="h-full w-full">
              <PinFit>
                <VariantScoreboard progress={scrollYProgress} />
              </PinFit>
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
            <h2 className="font-display text-4xl leading-[1.04] font-bold tracking-[.02em] text-cream-100 uppercase">
              AI-backed scouting for young cricketers
            </h2>
            <p className="mt-4 text-caption font-semibold tracking-[.16em] text-cream-200 uppercase">
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
            <VariantScoreboard />
          </motion.div>
        </div>
      )}
    </section>
  );
}

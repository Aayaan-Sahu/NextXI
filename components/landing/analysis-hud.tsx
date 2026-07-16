"use client";

import { useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  type MotionValue,
} from "motion/react";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const BALL_SPEED_MPH = 68.2;

/** Scroll progress at which each HUD layer switches on. */
const STAGE_AT = [0.06, 0.28, 0.5, 0.6, 0.7];

function stageFor(progress: number) {
  let stage = 0;
  for (const threshold of STAGE_AT) if (progress > threshold) stage++;
  return stage;
}

const SHOT_METRICS = [
  { label: "Bat swing", score: 82 },
  { label: "Balance", score: 76 },
  { label: "Timing", score: 68 },
];

function reveal(shown: boolean) {
  return `transition-all duration-500 ${shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`;
}

/** A small mono callout pinned at a percentage position over the video. */
function Chip({
  children,
  shown,
  x,
  y,
}: {
  children: React.ReactNode;
  shown: boolean;
  x: string;
  y: string;
}) {
  return (
    <div style={{ left: x, top: y }} className="absolute">
      <span
        className={`flex items-center gap-1.5 rounded border border-gold-500/40 bg-pitch-950/75 px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[.08em] whitespace-nowrap text-gold-500 uppercase backdrop-blur-sm ${reveal(shown)}`}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * Broadcast-style analysis overlays that build up as the visitor scrubs
 * through the batting video: framing brackets, ball tracking, a speed
 * readout, technique callouts, then a shot-metrics panel. All values are
 * scripted demo numbers, not live CV output. Everything subscribes to the
 * scroll value via events — direct transform bindings proved unreliable.
 */
export function AnalysisHud({
  progress,
  scrub,
}: {
  progress: MotionValue<number>;
  scrub: boolean;
}) {
  // Without scrubbing (touch devices, reduced motion) the video autoplays
  // and the HUD sits fully assembled as a static broadcast overlay.
  const [stage, setStage] = useState(scrub ? 0 : STAGE_AT.length);
  const track = useMotionValue(scrub ? 0 : 1);
  const speedText = useMotionValue(scrub ? "0.0" : BALL_SPEED_MPH.toFixed(1));
  const hudOpacity = useMotionValue(1);

  useMotionValueEvent(progress, "change", (p) => {
    if (!scrub) return;
    setStage(stageFor(p));
    track.set(clamp01((p - 0.12) / 0.3));
    speedText.set((BALL_SPEED_MPH * clamp01((p - 0.28) / 0.14)).toFixed(1));
    // Clear the HUD before the headline takes the frame.
    hudOpacity.set(1 - clamp01((p - 0.78) / 0.08));
  });

  return (
    <motion.div
      aria-hidden
      style={{ opacity: hudOpacity }}
      className="pointer-events-none absolute inset-0 max-sm:hidden"
    >
      {/* framing brackets */}
      <div
        className={`absolute inset-4 transition-opacity duration-700 sm:inset-6 ${
          stage >= 1 ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="absolute top-0 left-0 size-6 border-t-2 border-l-2 border-gold-500/50" />
        <span className="absolute top-0 right-0 size-6 border-t-2 border-r-2 border-gold-500/50" />
        <span className="absolute bottom-0 left-0 size-6 border-b-2 border-l-2 border-gold-500/50" />
        <span className="absolute right-0 bottom-0 size-6 border-r-2 border-b-2 border-gold-500/50" />
      </div>

      {/* status badges */}
      <div className={`absolute top-9 left-9 sm:top-11 sm:left-11 ${reveal(stage >= 1)}`}>
        <span className="flex items-center gap-2 rounded bg-rust-600 px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[.18em] text-cream-50 uppercase">
          <motion.span
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="size-1.5 rounded-full bg-gold-500"
          />
          Analysis
        </span>
      </div>
      <div
        className={`absolute top-10 right-9 font-mono text-[11px] font-semibold tracking-[.2em] text-sage-400 uppercase sm:top-12 sm:right-11 ${reveal(
          stage >= 1,
        )}`}
      >
        NX·Vision
      </div>

      {/* ball tracking — viewBox matches a 16:10 frame so the stroke stays
          near-uniform; dash-based path drawing breaks with non-scaling-stroke */}
      <svg
        viewBox="0 0 144 90"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <motion.path
          d="M 2.9 27 Q 34.6 46.8 57.6 68.4 Q 72 63 87.8 54"
          fill="none"
          strokeWidth={0.5}
          strokeLinecap="round"
          className="stroke-gold-500/90"
          style={{ pathLength: track }}
        />
        <circle
          cx={57.6}
          cy={68.4}
          r={1.3}
          className={`fill-rust-500 transition-opacity duration-500 ${
            stage >= 2 ? "opacity-100" : "opacity-0"
          }`}
        />
      </svg>
      <Chip shown={stage >= 2} x="34%" y="86%">
        Pitched · good length
      </Chip>

      {/* speed readout */}
      <div className={`absolute top-[22%] left-[6%] ${reveal(stage >= 2)}`}>
        <div className="font-mono text-[10px] font-semibold tracking-[.24em] text-sage-400 uppercase">
          Ball speed
        </div>
        <div className="mt-1 font-mono text-4xl font-semibold text-gold-500">
          <motion.span>{speedText}</motion.span>
          <span className="ml-1.5 text-sm text-sage-400">mph</span>
        </div>
      </div>

      {/* technique callouts */}
      <Chip shown={stage >= 3} x="66%" y="32%">
        Front elbow · 138°
      </Chip>
      <Chip shown={stage >= 3} x="52%" y="18%">
        Head still ✓
      </Chip>
      <Chip shown={stage >= 4} x="24%" y="48%">
        Bat angle · 42°
      </Chip>
      <Chip shown={stage >= 4} x="56%" y="74%">
        Stride · 0.9 m
      </Chip>

      {/* shot metrics panel */}
      <div className={`absolute top-1/2 right-[4%] w-48 -translate-y-1/2 ${reveal(stage >= 5)}`}>
        <div className="rounded-md border border-pitch-700 bg-pitch-950/85 p-3.5 backdrop-blur-sm">
          <div className="mb-3 font-mono text-[10px] font-semibold tracking-[.22em] text-gold-500 uppercase">
            Shot metrics
          </div>
          {SHOT_METRICS.map((metric) => (
            <div className="mb-2.5 last:mb-0" key={metric.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-[12px] tracking-[.08em] text-cream-200 uppercase">
                  {metric.label}
                </span>
                <span className="font-mono text-[12px] font-semibold text-gold-500">
                  {metric.score}
                </span>
              </div>
              <div className="mt-1 h-[3px] overflow-hidden rounded-sm bg-black/40">
                <div
                  className="h-full rounded-sm bg-gold-500 transition-[width] duration-700 ease-out"
                  style={{ width: stage >= 5 ? `${metric.score}%` : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

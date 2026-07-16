"use client";

import { motion } from "motion/react";

/** Shared card frame so all three step animations sit in matching panels. */
function AnimationPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-[10px] border border-cream-400 bg-white">
      {children}
    </div>
  );
}

/** Step 1: a video chip floats up into a dashed upload tray, on repeat. */
export function UploadAnimation() {
  return (
    <AnimationPanel>
      <div className="flex flex-col items-center gap-5">
        <div className="flex size-24 items-center justify-center rounded-[10px] border-2 border-dashed border-rust-600/50">
          <motion.span
            animate={{ y: [4, -4, 4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="font-display text-2xl font-bold text-rust-600"
          >
            ↑
          </motion.span>
        </div>

        <motion.div
          animate={{ y: [24, -60], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 2.4,
            times: [0, 0.25, 0.75, 1],
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="flex items-center gap-2 rounded-md bg-pitch-900 px-3 py-2"
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-gold-500 text-[9px] text-pitch-900">
            ▶
          </span>
          <span className="font-mono text-[10px] font-semibold tracking-[.15em] text-cream-200 uppercase">
            over-14.mp4
          </span>
        </motion.div>

        <div className="h-1 w-36 overflow-hidden rounded-full bg-cream-300">
          <motion.div
            animate={{ x: ["-100%", "0%"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full rounded-full bg-rust-600"
          />
        </div>
      </div>
    </AnimationPanel>
  );
}

const LAYER_ONE = [24, 64, 104, 144];
const LAYER_TWO = [44, 84, 124];

/** Step 2: a two-layer network where neurons fire left to right, on repeat. */
export function NeuralNetAnimation() {
  const cycle = 2.8;

  return (
    <AnimationPanel>
      <svg viewBox="0 0 220 168" className="h-48 w-auto" fill="none">
        {LAYER_ONE.map((y1) =>
          LAYER_TWO.map((y2) => (
            <line
              key={`${y1}-${y2}`}
              x1={50}
              y1={y1}
              x2={170}
              y2={y2}
              className="stroke-cream-400"
              strokeWidth={1}
            />
          )),
        )}
        {LAYER_ONE.map((y1, i) =>
          LAYER_TWO.map((y2, j) => (
            <motion.line
              key={`fire-${y1}-${y2}`}
              x1={50}
              y1={y1}
              x2={170}
              y2={y2}
              className="stroke-gold-600"
              strokeWidth={1.5}
              animate={{ opacity: [0, 0, 1, 0, 0] }}
              transition={{
                duration: cycle,
                times: [0, 0.3, 0.45, 0.6, 1],
                delay: (i + j) * 0.12,
                repeat: Infinity,
              }}
            />
          )),
        )}

        {LAYER_ONE.map((y, i) => (
          <g key={`in-${y}`}>
            <circle cx={50} cy={y} r={9} className="fill-cream-100 stroke-rust-600" strokeWidth={1.5} />
            <motion.circle
              cx={50}
              cy={y}
              r={9}
              className="fill-rust-600"
              animate={{ opacity: [0, 1, 0, 0] }}
              transition={{
                duration: cycle,
                times: [0, 0.15, 0.4, 1],
                delay: i * 0.15,
                repeat: Infinity,
              }}
            />
          </g>
        ))}
        {LAYER_TWO.map((y, i) => (
          <g key={`out-${y}`}>
            <circle cx={170} cy={y} r={9} className="fill-cream-100 stroke-rust-600" strokeWidth={1.5} />
            <motion.circle
              cx={170}
              cy={y}
              r={9}
              className="fill-gold-600"
              animate={{ opacity: [0, 0, 1, 0] }}
              transition={{
                duration: cycle,
                times: [0, 0.5, 0.7, 1],
                delay: i * 0.15,
                repeat: Infinity,
              }}
            />
          </g>
        ))}
      </svg>
    </AnimationPanel>
  );
}

/** Step 3: a cursor glides in, clicks Connect, and the button flips state. */
export function ConnectAnimation() {
  const cycle = 3.2;

  return (
    <AnimationPanel>
      <div className="relative w-56 rounded-[10px] border border-cream-400 bg-cream-50 p-4">
        <div className="flex items-center gap-3">
          <span className="size-10 rounded-full bg-gold-500" />
          <div className="flex flex-col gap-1.5">
            <span className="h-2 w-24 rounded-full bg-pitch-900/80" />
            <span className="h-2 w-16 rounded-full bg-cream-400" />
          </div>
        </div>

        <div className="relative mt-4">
          <motion.div
            animate={{ opacity: [1, 1, 0, 0, 1] }}
            transition={{ duration: cycle, times: [0, 0.5, 0.55, 0.95, 1], repeat: Infinity }}
            className="rounded-md bg-rust-600 py-2 text-center text-xs font-bold text-cream-50"
          >
            Connect
          </motion.div>
          <motion.div
            animate={{ opacity: [0, 0, 1, 1, 0] }}
            transition={{ duration: cycle, times: [0, 0.5, 0.55, 0.95, 1], repeat: Infinity }}
            className="absolute inset-0 rounded-md bg-gold-500 py-2 text-center text-xs font-bold text-pitch-900"
          >
            Connected ✓
          </motion.div>
          {/* click ripple */}
          <motion.span
            animate={{ opacity: [0, 0, 0.6, 0, 0], scale: [0.4, 0.4, 1.6, 2, 2] }}
            transition={{ duration: cycle, times: [0, 0.48, 0.55, 0.68, 1], repeat: Infinity }}
            className="pointer-events-none absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold-600"
          />
        </div>

        {/* cursor */}
        <motion.svg
          viewBox="0 0 24 24"
          animate={{
            x: [72, 0, 0, 0, 72],
            y: [56, 0, 0, 0, 56],
            scale: [1, 1, 0.8, 1, 1],
            opacity: [0, 1, 1, 1, 0],
          }}
          transition={{
            duration: cycle,
            times: [0, 0.4, 0.52, 0.6, 1],
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute right-14 bottom-3 size-5 fill-pitch-900"
        >
          <path d="M5 3l14 8-6.5 1.5L16 19l-3 1.5-3.5-6.5L5 18V3z" />
        </motion.svg>
      </div>
    </AnimationPanel>
  );
}

/**
 * Dashed arrow that draws itself between steps as it scrolls into view.
 * `flip` mirrors the curve for alternating rows.
 */
export function StepArrow({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`flex justify-center py-2 ${flip ? "-scale-x-100" : ""}`} aria-hidden>
      <svg viewBox="0 0 220 130" className="h-28 w-auto text-rust-600/70" fill="none">
        <motion.path
          d="M30 12 C 80 100, 150 20, 186 96"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="7 9"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        />
        <motion.path
          d="M170 92 L 188 100 L 183 80"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.25, delay: 0.85 }}
        />
      </svg>
    </div>
  );
}

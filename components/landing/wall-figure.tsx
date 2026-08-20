"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * The wall's left-page graphic: a pose-skeleton batter mid front-foot drive —
 * the platform's view of a player — drawn in the step-animation line-art
 * idiom. Limbs draw in on scroll, then a slow scan sweeps the figure, with a
 * front-elbow readout and stride bracket echoing the report's measurements.
 * Two colours only: cream for the body, amber for everything the platform
 * reads off it — bat, ball, annotations, scan — so it matches the report.
 */

// Joints of the skeleton, facing right into the drive.
const JOINTS: [number, number][] = [
  [96, 380], // back ankle
  [128, 306], // back knee
  [150, 228], // back hip
  [170, 226], // front hip
  [206, 300], // front knee
  [238, 378], // front ankle
  [140, 134], // back shoulder
  [178, 132], // front shoulder
  [166, 186], // back elbow
  [210, 168], // front elbow
  [225, 211], // grip
];

// Each limb chain draws in as its own stroke.
const LIMBS = [
  "M96 380 L128 306 L150 228", // back leg
  "M238 378 L206 300 L170 226", // front leg
  "M150 228 L170 226", // hips
  "M160 227 L158 140", // spine
  "M140 134 L178 132", // shoulders
  "M158 140 L169 114", // neck
  "M140 134 L166 186 L225 211", // back arm
  "M178 132 L210 168 L225 211", // front arm
];

export function WallFigure({ className }: { className?: string }) {
  const reduced = useReducedMotion() ?? false;

  return (
    <svg aria-hidden className={className} fill="none" viewBox="0 0 360 430">
      {/* crease */}
      <path className="stroke-cream-200/25" d="M24 386 H336" strokeWidth={1.5} />
      <path className="stroke-cream-200/25" d="M60 386 V398 M300 386 V398" strokeWidth={1.5} />

      {/* limbs draw in on scroll */}
      {LIMBS.map((d, i) => (
        <motion.path
          key={d}
          className="stroke-cream-200/70"
          d={d}
          initial={reduced ? false : { pathLength: 0 }}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.5 }}
          whileInView={{ pathLength: 1 }}
        />
      ))}

      {/* bat, then ball arriving at the face */}
      <motion.path
        className="stroke-amber-500"
        d="M225 211 L285 300"
        initial={reduced ? false : { pathLength: 0 }}
        strokeLinecap="round"
        strokeWidth={7}
        transition={{ duration: 0.4, delay: 0.85, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.5 }}
        whileInView={{ pathLength: 1 }}
      />
      <motion.g
        initial={reduced ? false : { opacity: 0 }}
        transition={{ duration: 0.3, delay: 1.2 }}
        viewport={{ once: true, amount: 0.5 }}
        whileInView={{ opacity: 1 }}
      >
        <circle className="fill-amber-500" cx={306} cy={318} r={7} />
        <path
          className="stroke-amber-500/45"
          d="M318 334 L326 342 M322 322 L332 328"
          strokeLinecap="round"
          strokeWidth={2}
        />
      </motion.g>

      {/* head + joints */}
      <motion.g
        initial={reduced ? false : { opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        viewport={{ once: true, amount: 0.5 }}
        whileInView={{ opacity: 1 }}
      >
        <circle className="fill-pitch-800 stroke-cream-200/70" cx={172} cy={96} r={17} strokeWidth={2.5} />
        {JOINTS.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} className="fill-cream-100" cx={cx} cy={cy} r={4.5} />
        ))}
      </motion.g>

      {/* measurement annotations, in the report's voice — amber is measured */}
      <motion.g
        initial={reduced ? false : { opacity: 0 }}
        transition={{ duration: 0.5, delay: 1.35 }}
        viewport={{ once: true, amount: 0.5 }}
        whileInView={{ opacity: 1 }}
      >
        <path
          className="stroke-amber-500/80"
          d="M222 146 A30 30 0 0 1 234 178"
          strokeDasharray="3 4"
          strokeWidth={1.5}
        />
        <text
          className="fill-amber-500 font-sans text-micro font-semibold tabular-nums"
          x={252}
          y={162}
        >
          Elbow 128°
        </text>
        <path
          className="stroke-amber-500/60"
          d="M96 410 H238 M96 404 V416 M238 404 V416"
          strokeDasharray="3 4"
          strokeWidth={1.5}
        />
        <text
          className="fill-amber-500 font-sans text-micro font-semibold tabular-nums"
          textAnchor="middle"
          x={167}
          y={427}
        >
          Stride 92 cm
        </text>
      </motion.g>

      {/* slow scan sweeping the figure, HUD-style */}
      {!reduced && (
        <motion.g
          animate={{ y: [0, 326, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <path className="stroke-amber-500/35" d="M60 60 H300" strokeWidth={2} />
        </motion.g>
      )}
    </svg>
  );
}

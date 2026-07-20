"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, type MotionValue } from "motion/react";
import { HERO_DRIVE_TRACK, type TrackSample } from "@/components/landing/hero-drive-track";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/* ── track math (frame % ⇄ metres via the calibration block) ───────────── */

const { calibration, events, video } = HERO_DRIVE_TRACK;
const FRAME_H_M = calibration.subjectHeightM / (calibration.subjectHeightPct / 100);
const FRAME_W_M = FRAME_H_M * video.aspect;
const MPS_TO_MPH = 2.23694;

/** Linear interpolation over a sparse [t, x, y] channel; clamps at the ends. */
function sampleAt(channel: TrackSample[], t: number): [number, number] {
  if (t <= channel[0][0]) return [channel[0][1], channel[0][2]];
  const last = channel[channel.length - 1];
  if (t >= last[0]) return [last[1], last[2]];
  let i = 1;
  while (channel[i][0] < t) i++;
  const [t0, x0, y0] = channel[i - 1];
  const [t1, x1, y1] = channel[i];
  const k = (t - t0) / (t1 - t0);
  return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
}

function metersBetween(a: [number, number], b: [number, number]) {
  const dx = ((b[0] - a[0]) / 100) * FRAME_W_M;
  const dy = ((b[1] - a[1]) / 100) * FRAME_H_M;
  return Math.hypot(dx, dy);
}

/** Interior angle at `mid` (degrees), computed in metre space. */
function angleAt(a: [number, number], mid: [number, number], c: [number, number]) {
  const v1 = [((a[0] - mid[0]) / 100) * FRAME_W_M, ((a[1] - mid[1]) / 100) * FRAME_H_M];
  const v2 = [((c[0] - mid[0]) / 100) * FRAME_W_M, ((c[1] - mid[1]) / 100) * FRAME_H_M];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const mag = Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]);
  return mag === 0 ? 0 : (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI;
}

function speedMps(channel: TrackSample[], t: number, window = 0.15) {
  return metersBetween(sampleAt(channel, t - window), sampleAt(channel, t)) / window;
}

/* ── derived once from the data (real numbers, not copy) ───────────────── */

const P = HERO_DRIVE_TRACK.points;
const BALL = HERO_DRIVE_TRACK.ball;
const BALL_T0 = BALL[0][0];
const BALL_T1 = BALL[BALL.length - 1][0];
const IMPACT_T = events.find((e) => e.label === "impact")!.t;

const FEED_MPH = (metersBetween(sampleAt(BALL, 6.0), sampleAt(BALL, 6.6)) / 0.6) * MPS_TO_MPH;
const EXIT_MPH = (metersBetween(sampleAt(BALL, 6.8), sampleAt(BALL, 7.2)) / 0.4) * MPS_TO_MPH;

/** Bat-tip trail geometry in the 160×90 svg space, with cumulative length. */
const TRAIL = (() => {
  const pts: Array<{ x: number; y: number; t: number; len: number }> = [];
  let len = 0;
  for (let t = 6.0; t <= 7.4; t += 1 / 60) {
    const [x, y] = sampleAt(P.batTip, t);
    const sx = x * 1.6, sy = y * 0.9;
    if (pts.length) len += Math.hypot(sx - pts[pts.length - 1].x, sy - pts[pts.length - 1].y);
    pts.push({ x: sx, y: sy, t, len });
  }
  return { d: `M ${pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ")}`, pts, total: len };
})();

function trailLenAt(t: number) {
  if (t <= 6.0) return 0;
  const pt = TRAIL.pts.find((p) => p.t >= t);
  return pt ? pt.len : TRAIL.total;
}

const LIMBS: Array<[keyof typeof P, keyof typeof P]> = [
  ["shoulder", "elbow"], ["elbow", "hands"], ["shoulder", "hip"],
  ["hip", "kneeF"], ["kneeF", "ankleF"], ["hip", "kneeB"], ["kneeB", "ankleB"],
];
const JOINTS = Object.keys(P) as Array<keyof typeof P>;

const fmtTime = (t: number) =>
  `T+00:${String(Math.floor(t)).padStart(2, "0")}.${String(Math.floor((t % 1) * 100)).padStart(2, "0")}`;

/* ── component ─────────────────────────────────────────────────────────── */

/**
 * Machine-vision overlay for the drive video. Reads video.currentTime every
 * frame (works for scroll-scrub and autoplay alike) and renders the
 * hand-annotated track: skeleton, bat-path trail, ball tracking, live-
 * computed angles and speeds. Geometry updates are imperative (refs, one
 * rAF) so nothing re-renders at 60 Hz; only the phase label goes through
 * React state. Cold vision-mint on near-white — deliberately not Crease.
 */
export function AnalysisHud({
  progress,
  scrub,
  videoRef,
}: {
  progress: MotionValue<number>;
  scrub: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const [phase, setPhase] = useState(events[0].label);
  const frameBoxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<SVGRectElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const batRef = useRef<SVGLineElement>(null);
  const ballRef = useRef<SVGCircleElement>(null);
  const ballTailRef = useRef<SVGPathElement>(null);
  const impactRef = useRef<SVGCircleElement>(null);
  const subjectTagRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const elbowRef = useRef<HTMLSpanElement>(null);
  const strideRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const feedRef = useRef<HTMLSpanElement>(null);
  const exitRef = useRef<HTMLSpanElement>(null);
  const limbRefs = useRef<Array<SVGLineElement | null>>([]);
  const jointRefs = useRef<Partial<Record<keyof typeof P, SVGGElement | null>>>({});
  const phaseRef = useRef(phase);

  // Fade with the scroll story in scrub mode: in after the red wipe, out
  // before the headline takes the frame. Always on when the video autoplays.
  const hudOpacity = useMotionValue(scrub ? 0 : 1);
  useMotionValueEvent(progress, "change", (p) => {
    if (scrub) hudOpacity.set(clamp01((p - 0.02) / 0.03) - clamp01((p - 0.78) / 0.08));
  });

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const vid = videoRef.current;
      const frameBox = frameBoxRef.current;
      if (!vid || !frameBox || !vid.parentElement) return;

      // Pin the overlay to the video's object-contain content box.
      const cw = vid.clientWidth, ch = vid.clientHeight;
      const scale = Math.min(cw / video.aspect, ch);
      const vw = scale * video.aspect, vh = scale;
      frameBox.style.left = `${(cw - vw) / 2}px`;
      frameBox.style.top = `${(ch - vh) / 2}px`;
      frameBox.style.width = `${vw}px`;
      frameBox.style.height = `${vh}px`;

      const t = vid.currentTime;

      // joints + limbs + bounding box
      let minX = 100, minY = 100, maxX = 0, maxY = 0;
      for (const key of JOINTS) {
        const [x, y] = sampleAt(P[key], t);
        const g = jointRefs.current[key];
        if (g) g.setAttribute("transform", `translate(${x * 1.6} ${y * 0.9})`);
        if (key !== "batTip") {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
      LIMBS.forEach(([a, b], i) => {
        const line = limbRefs.current[i];
        if (!line) return;
        const [ax, ay] = sampleAt(P[a], t);
        const [bx, by] = sampleAt(P[b], t);
        line.setAttribute("x1", String(ax * 1.6)); line.setAttribute("y1", String(ay * 0.9));
        line.setAttribute("x2", String(bx * 1.6)); line.setAttribute("y2", String(by * 0.9));
      });
      const box = boxRef.current;
      if (box) {
        box.setAttribute("x", String((minX - 3) * 1.6));
        box.setAttribute("y", String((minY - 4) * 0.9));
        box.setAttribute("width", String((maxX - minX + 6) * 1.6));
        box.setAttribute("height", String((maxY - minY + 8) * 0.9));
      }
      const tag = subjectTagRef.current;
      if (tag) {
        tag.style.left = `${minX - 3}%`;
        tag.style.top = `calc(${minY - 4}% - 20px)`;
      }

      // bat + trail
      const bat = batRef.current;
      if (bat) {
        const [hx, hy] = sampleAt(P.hands, t);
        const [tx, ty] = sampleAt(P.batTip, t);
        bat.setAttribute("x1", String(hx * 1.6)); bat.setAttribute("y1", String(hy * 0.9));
        bat.setAttribute("x2", String(tx * 1.6)); bat.setAttribute("y2", String(ty * 0.9));
      }
      const trail = trailRef.current;
      if (trail) {
        const reveal = trailLenAt(t);
        trail.style.strokeDasharray = `${reveal} ${TRAIL.total + 1}`;
        trail.style.opacity = t > 6.05 ? "0.75" : "0";
      }

      // ball marker + short tail
      const ball = ballRef.current, tail = ballTailRef.current;
      const ballVisible = t >= BALL_T0 && t <= BALL_T1;
      if (ball) {
        ball.style.opacity = ballVisible ? "1" : "0";
        if (ballVisible) {
          const [bx, by] = sampleAt(BALL, t);
          ball.setAttribute("cx", String(bx * 1.6));
          ball.setAttribute("cy", String(by * 0.9));
        }
      }
      if (tail) {
        tail.style.opacity = ballVisible ? "0.6" : "0";
        if (ballVisible) {
          const pts: string[] = [];
          for (let dt = 0.3; dt >= 0; dt -= 0.05) {
            if (t - dt < BALL_T0) continue;
            const [bx, by] = sampleAt(BALL, t - dt);
            pts.push(`${bx * 1.6} ${by * 0.9}`);
          }
          if (pts.length > 1) tail.setAttribute("d", `M ${pts.join(" L ")}`);
        }
      }

      // impact pulse
      const impact = impactRef.current;
      if (impact) {
        const k = 1 - Math.min(1, Math.abs(t - IMPACT_T) / 0.35);
        impact.style.opacity = String(0.9 * k);
        impact.setAttribute("r", String(1.5 + (1 - k) * 7));
      }

      // readouts
      const shoulder = sampleAt(P.shoulder, t), elbow = sampleAt(P.elbow, t), hands = sampleAt(P.hands, t);
      const elbowDeg = angleAt(shoulder, elbow, hands);
      const strideM = metersBetween(sampleAt(P.ankleF, t), sampleAt(P.ankleB, t));
      const tipMph = speedMps(P.batTip, t) * MPS_TO_MPH;
      if (timeRef.current) timeRef.current.textContent = `${fmtTime(t)} · F${String(Math.floor(t * video.fps)).padStart(3, "0")}`;
      if (elbowRef.current) elbowRef.current.textContent = `${elbowDeg.toFixed(1)}°`;
      if (strideRef.current) strideRef.current.textContent = `${strideM.toFixed(2)} m`;
      if (tipRef.current) tipRef.current.textContent = `${tipMph.toFixed(1)} mph`;
      if (feedRef.current) feedRef.current.textContent = t >= BALL_T0 ? `${FEED_MPH.toFixed(1)} mph` : "—";
      if (exitRef.current) exitRef.current.textContent = t >= 6.9 ? `${EXIT_MPH.toFixed(1)} mph` : "—";

      // phase (React state, changes rarely)
      let current = events[0].label;
      for (const e of events) if (t >= e.t) current = e.label;
      if (current !== phaseRef.current) {
        phaseRef.current = current;
        setPhase(current);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videoRef]);

  return (
    <motion.div
      aria-hidden
      style={{ opacity: hudOpacity }}
      className="pointer-events-none absolute inset-0 font-mono max-sm:hidden"
    >
      <div ref={frameBoxRef} className="absolute">
        {/* corner ticks */}
        <div className="absolute inset-3">
          <span className="absolute top-0 left-0 size-4 border-t border-l border-white/40" />
          <span className="absolute top-0 right-0 size-4 border-t border-r border-white/40" />
          <span className="absolute bottom-0 left-0 size-4 border-b border-l border-white/40" />
          <span className="absolute right-0 bottom-0 size-4 border-r border-b border-white/40" />
        </div>

        {/* tracked geometry */}
        <svg
          ref={svgRef}
          viewBox="0 0 160 90"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <rect
            ref={boxRef}
            fill="none"
            strokeWidth={0.22}
            strokeDasharray="1.6 1.1"
            className="stroke-white/45"
          />
          <path ref={trailRef} d={TRAIL.d} fill="none" strokeWidth={0.55} strokeLinecap="round" strokeLinejoin="round" className="stroke-vision-500" />
          {LIMBS.map((pair, i) => (
            <line
              key={pair.join("-")}
              ref={(el) => { limbRefs.current[i] = el; }}
              strokeWidth={0.3}
              className="stroke-white/70"
            />
          ))}
          <line ref={batRef} strokeWidth={0.42} className="stroke-white/90" />
          {JOINTS.map((key) => (
            <g key={key} ref={(el) => { jointRefs.current[key] = el; }}>
              <line x1={-0.9} y1={0} x2={0.9} y2={0} strokeWidth={0.26} className="stroke-vision-500" />
              <line x1={0} y1={-0.9} x2={0} y2={0.9} strokeWidth={0.26} className="stroke-vision-500" />
            </g>
          ))}
          <path ref={ballTailRef} fill="none" strokeWidth={0.35} strokeLinecap="round" className="stroke-vision-300" />
          <circle ref={ballRef} r={0.9} className="fill-vision-300" />
          <circle
            ref={impactRef}
            cx={69.5 * 1.6}
            cy={84.5 * 0.9}
            fill="none"
            strokeWidth={0.35}
            className="stroke-vision-300"
            style={{ opacity: 0 }}
          />
        </svg>

        {/* subject tag rides the bounding box */}
        <div
          ref={subjectTagRef}
          className="absolute text-[11px] font-semibold tracking-[.18em] text-white/90 uppercase"
        >
          <span className="bg-pitch-950/80 px-2 py-1">Subject 01 · Aryaman Varma · Pro</span>
        </div>

        {/* status bar */}
        <div className="absolute top-5 left-5">
          <span className="flex w-fit items-center gap-2 border border-white/20 bg-pitch-950/80 px-2.5 py-1.5 text-xs font-semibold tracking-[.22em] text-vision-500 uppercase backdrop-blur-sm">
            <motion.span
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="size-1.5 rounded-full bg-vision-500"
            />
            Tracking
          </span>
        </div>
        <div className="absolute top-5 right-5 bg-pitch-950/80 px-2.5 py-1.5 text-right backdrop-blur-sm">
          <span ref={timeRef} className="text-xs font-semibold tracking-[.12em] text-white" />
          <div className="text-[11px] tracking-[.18em] text-white/75 uppercase">{video.fps} fps · 1280×720</div>
        </div>

        {/* live readouts */}
        <div className="absolute top-[30%] left-5 flex flex-col gap-1.5 border border-white/15 bg-pitch-950/80 px-3.5 py-3 text-[13px] tracking-[.08em] tabular-nums backdrop-blur-sm">
          {(
            [
              ["Elbow", elbowRef],
              ["Stride", strideRef],
              ["Bat tip", tipRef],
              ["Feed", feedRef],
              ["Exit", exitRef],
            ] as const
          ).map(([label, ref]) => (
            <div key={label} className="flex w-44 items-baseline justify-between border-b border-white/10 pb-1.5 last:border-b-0 last:pb-0">
              <span className="text-[11px] tracking-[.2em] text-white/75 uppercase">{label}</span>
              <span ref={ref} className="font-semibold text-vision-300" />
            </div>
          ))}
        </div>

        {/* phase + event rail */}
        <div className="absolute bottom-6 left-5 border border-white/15 bg-pitch-950/80 px-3.5 py-2.5 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[.2em] uppercase">
            <span className="text-white/75">Phase</span>
            <span className="text-vision-500">▸ {phase}</span>
          </div>
          <div className="relative h-px w-56 bg-white/25">
            {events.map((e) => (
              <span
                key={e.label}
                style={{ left: `${(e.t / video.durationS) * 100}%` }}
                className={`absolute -top-[3px] h-[7px] w-px ${phase === e.label ? "bg-vision-500" : "bg-white/45"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

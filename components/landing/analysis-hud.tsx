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

/** One box recipe for every piece of chrome on the frame. There used to be
    three — some bordered, some blurred, four different paddings — which read as
    three different overlays sharing a video. Flat ink, no border, no blur. */
const BOX = "bg-pitch-950/80 px-3 py-2.5";

/** The one tracked-uppercase treatment, matching `Kicker`. Labels only —
    figures are never tracked, and there is no second spacing value. */
const LABEL = "text-micro font-semibold tracking-[.16em] text-cream-200/70 uppercase";

/** "6.42s" — the elapsed clock, and nothing else. The frame counter and the
    "60 fps · 1280×720" line that used to sit here were machine trivia dressed
    as a readout; the Quiet Facts Rule says they don't compete with the shot. */
const fmtTime = (t: number) => `${t.toFixed(2)}s`;

/* ── component ─────────────────────────────────────────────────────────── */

/**
 * Machine-vision overlay for the drive video. Reads video.currentTime every
 * frame (works for scroll-scrub and autoplay alike) and renders the
 * hand-annotated track: skeleton, bat-path trail, ball tracking, live-
 * computed angles and speeds. Geometry updates are imperative (refs, one
 * rAF) so nothing re-renders at 60 Hz; only the phase label goes through
 * React state.
 *
 * Drawn in the product's own palette: cream for the tracked skeleton, amber
 * for anything measured (the readouts, the bat path, the ball, the live
 * phase). Amber means *measured* everywhere else in the system, so a number
 * here reads as the same kind of fact the dashboard shows. The overlay used
 * to be mono type in phosphor-mint on pure white, which was a second design.
 *
 * On phones the object-contain frame is a short letterboxed strip, so the
 * chrome (status bar, readouts, phase rail) moves into the letterbox bands
 * around it; the tracked geometry stays on the frame at every size. On the
 * rare sub-640px landscape viewport there are no bands, so that off-frame
 * chrome clips away and only the on-frame geometry shows — intentional.
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
  const limbRefs = useRef<Array<SVGLineElement | null>>([]);
  const jointRefs = useRef<Partial<Record<keyof typeof P, SVGGElement | null>>>({});
  const phaseRef = useRef(phase);

  // Fade with the scroll story in scrub mode: in after the red wipe, out
  // before the headline takes the frame. Always on when the video autoplays.
  const hudOpacity = useMotionValue(scrub ? 0 : 1);
  useMotionValueEvent(progress, "change", (p) => {
    if (scrub) hudOpacity.set(clamp01((p - 0.02) / 0.03) - clamp01((p - 0.78) / 0.08));
  });
  // useCanScrub's server snapshot is true, so SSR'd autoplay visits (phones,
  // reduced motion) hydrate with hudOpacity frozen at 0 — the motion value's
  // initial argument is captured once. Snap it on when scrub settles to false.
  useEffect(() => {
    if (!scrub) hudOpacity.set(1);
  }, [scrub, hudOpacity]);

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
        // Amber carries more weight than the mint it replaced, so the path
        // traces the swing rather than highlighting over it.
        trail.style.opacity = t > 6.05 ? "0.6" : "0";
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
      if (timeRef.current) timeRef.current.textContent = fmtTime(t);
      if (elbowRef.current) elbowRef.current.textContent = `${elbowDeg.toFixed(1)}°`;
      if (strideRef.current) strideRef.current.textContent = `${strideM.toFixed(2)} m`;
      if (tipRef.current) tipRef.current.textContent = `${tipMph.toFixed(1)} mph`;

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
      className="pointer-events-none absolute inset-0"
    >
      <div ref={frameBoxRef} className="absolute">
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
            className="stroke-cream-200/45"
          />
          <path ref={trailRef} d={TRAIL.d} fill="none" strokeWidth={0.45} strokeLinecap="round" strokeLinejoin="round" className="stroke-amber-500" />
          {LIMBS.map((pair, i) => (
            <line
              key={pair.join("-")}
              ref={(el) => { limbRefs.current[i] = el; }}
              strokeWidth={0.3}
              className="stroke-cream-200/70"
            />
          ))}
          <line ref={batRef} strokeWidth={0.42} className="stroke-cream-50/90" />
          {/* Joints are cream, not amber. Nine amber crosses plus an amber bat
              path plus an amber ball spends the accent on the tracking rig
              instead of the measurement — amber is reserved for the swing path
              and the ball, which are what the readouts are about. */}
          {JOINTS.map((key) => (
            <g key={key} ref={(el) => { jointRefs.current[key] = el; }}>
              <line x1={-0.9} y1={0} x2={0.9} y2={0} strokeWidth={0.26} className="stroke-cream-50/80" />
              <line x1={0} y1={-0.9} x2={0} y2={0.9} strokeWidth={0.26} className="stroke-cream-50/80" />
            </g>
          ))}
          <path ref={ballTailRef} fill="none" strokeWidth={0.35} strokeLinecap="round" className="stroke-amber-500" />
          <circle ref={ballRef} r={0.9} className="fill-amber-500" />
          <circle
            ref={impactRef}
            cx={69.5 * 1.6}
            cy={84.5 * 0.9}
            fill="none"
            strokeWidth={0.35}
            className="stroke-amber-500"
            style={{ opacity: 0 }}
          />
        </svg>

        {/* subject tag rides the bounding box — the real player, named, for
            credibility (Aryaman is the demo subject, not a benchmark pro). */}
        <div ref={subjectTagRef} className="absolute">
          <div className={`w-fit ${BOX} max-sm:px-2 max-sm:py-1`}>
            <div className="text-caption font-semibold text-cream-50">Aryaman Varma</div>
            <div className="text-micro text-cream-200/70">
              Wisden Schools Cricketer &rsquo;25 · England U19
            </div>
          </div>
        </div>

        {/* Elapsed clock — rides the upper letterbox band on phones. */}
        <div
          className={`absolute top-5 right-5 ${BOX} max-sm:top-auto max-sm:right-0 max-sm:bottom-full max-sm:mb-2 max-sm:px-2 max-sm:py-1`}
        >
          <span
            ref={timeRef}
            className="text-caption font-semibold tabular-nums text-cream-50"
          />
        </div>

        {/* Readouts + phase. On phones both drop into the letterbox band below
            the frame (the frame itself is only ~220px tall); from sm the
            wrapper dissolves (display: contents) and they pin to the frame. */}
        <div className="absolute inset-x-0 top-full mt-2 flex flex-col gap-2 sm:contents">
          {/* The three live measurements. Amber is the measured value, cream
              names it — the same split the dashboard uses. Feed and exit speed
              used to sit here too, but both read "—" for most of the scrub. */}
          <div
            className={`absolute top-[30%] left-5 flex flex-col gap-2 ${BOX} max-sm:static max-sm:flex-row max-sm:justify-between max-sm:gap-2 max-sm:px-3 max-sm:py-2`}
          >
            {(
              [
                ["Elbow", elbowRef],
                ["Stride", strideRef],
                ["Bat tip", tipRef],
              ] as const
            ).map(([label, ref]) => (
              <div
                key={label}
                className="flex w-40 items-baseline justify-between gap-4 max-sm:w-auto max-sm:flex-col max-sm:items-center max-sm:gap-0.5"
              >
                <span className={LABEL}>{label}</span>
                <span
                  ref={ref}
                  className="text-caption font-semibold tabular-nums text-amber-500"
                />
              </div>
            ))}
          </div>

          {/* Where in the shot we are. The tick rail that used to sit under
              this said the same thing a second way. */}
          <div className={`absolute bottom-6 left-5 ${BOX} max-sm:static max-sm:px-3 max-sm:py-2`}>
            <div className="flex items-baseline gap-2.5">
              <span className={LABEL}>Phase</span>
              <span className="text-caption font-semibold text-amber-500">{phase}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

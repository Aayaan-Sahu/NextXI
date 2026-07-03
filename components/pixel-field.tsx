"use client";

import { useEffect, useRef } from "react";

const SCALE = 6; // CSS pixels per buffer pixel
const SKY_BANDS = ["#e3f1fc", "#d6eafa", "#c9e3f7"];
const FIELD_GREENS = ["#a5d69b", "#9ccf92"];
const BLADE_GREENS = ["#7dbf74", "#6fb367", "#8bc981"];

// Spring-damper constants for blade bend (underdamped so blades wobble as they settle)
const STIFFNESS = 120;
const DAMPING = 7;
const MAX_BEND = 3;
const BASE_BREEZE = 0.4; // faint constant motion between gusts

type Cloud = {
  x: number;
  y: number;
  speed: number;
  blocks: { dx: number; dy: number; w: number; h: number }[];
};
type Blade = {
  x: number;
  y: number;
  len: number;
  color: string;
  response: number; // per-blade sensitivity to wind
  bend: number;
  vel: number;
};
type Gust = { born: number; intensity: number; decay: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function makeClouds(w: number, skyH: number): Cloud[] {
  return Array.from({ length: Math.max(3, Math.round(w / 60)) }, () => ({
    x: rand(0, w),
    y: rand(skyH * 0.1, skyH * 0.65),
    speed: rand(1.5, 4),
    blocks: Array.from({ length: Math.round(rand(3, 5)) }, () => ({
      dx: Math.round(rand(0, 14)),
      dy: Math.round(rand(-3, 3)),
      w: Math.round(rand(6, 12)),
      h: Math.round(rand(3, 5)),
    })),
  }));
}

function makeBlades(w: number, fieldTop: number, h: number): Blade[] {
  return Array.from({ length: Math.round(w * (h - fieldTop) * 0.1) }, () => ({
    x: Math.round(rand(0, w - 1)),
    y: Math.round(rand(fieldTop + 2, h - 1)),
    len: Math.round(rand(2, 4)),
    color: pick(BLADE_GREENS),
    response: rand(0.6, 1.4),
    bend: 0,
    vel: 0,
  }));
}

function makeGust(t: number): Gust {
  return {
    born: t,
    intensity: rand(1.5, 4), // roughly the peak bend in pixels
    decay: rand(0.8, 1.6),
  };
}

// Field-wide gust strength: near-instant attack, exponential die-down.
function gustStrength(gusts: Gust[], t: number) {
  let s = 0;
  for (const g of gusts) {
    const age = t - g.born;
    s += g.intensity * (1 - Math.exp(-age * 10)) * Math.exp(-age / g.decay);
  }
  return s;
}

// Fast-moving turbulence ripples so the gust hits the field unevenly, never as one front.
function turbulence(x: number, t: number) {
  return 0.6 + 0.25 * Math.sin(x * 0.14 - t * 14) + 0.15 * Math.sin(x * 0.05 - t * 9 + 2);
}

function updateBlades(blades: Blade[], wind: number, t: number, dt: number) {
  for (const b of blades) {
    const force = wind * turbulence(b.x, t) * b.response * STIFFNESS;
    b.vel += (force - STIFFNESS * b.bend - DAMPING * b.vel) * dt;
    b.bend += b.vel * dt;
  }
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  clouds: Cloud[],
  blades: Blade[],
  t: number,
) {
  const fieldTop = Math.round(h * 0.62);

  SKY_BANDS.forEach((color, i) => {
    ctx.fillStyle = color;
    const bandH = Math.ceil(fieldTop / SKY_BANDS.length);
    ctx.fillRect(0, i * bandH, w, bandH);
  });

  for (const cloud of clouds) {
    const span = w + 30;
    const cx = ((cloud.x + t * cloud.speed) % span) - 30;
    cloud.blocks.forEach((b, i) => {
      ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#f3f8fc";
      ctx.beginPath();
      ctx.roundRect(cx + b.dx, cloud.y + b.dy, b.w, b.h, 2);
      ctx.fill();
    });
  }

  for (let x = 0; x < w; x += 12) {
    ctx.fillStyle = FIELD_GREENS[(x / 12) % 2]; // mown-stripe banding
    ctx.fillRect(x, fieldTop, 12, h - fieldTop);
  }

  for (const blade of blades) {
    const bend = Math.max(-MAX_BEND, Math.min(MAX_BEND, blade.bend));
    ctx.fillStyle = blade.color;
    for (let i = 0; i < blade.len; i++) {
      const lean = Math.round(bend * (i / blade.len) ** 1.5); // base stays rooted, tip leans most
      ctx.fillRect(blade.x + lean, blade.y - i, 1, 1);
    }
  }
}

export function PixelField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let clouds: Cloud[] = [];
    let blades: Blade[] = [];
    let gusts: Gust[] = [];
    let lastT = 0;

    const draw = (t: number) => {
      lastT = t;
      drawScene(ctx, canvas.width, canvas.height, clouds, blades, t);
    };

    const observer = new ResizeObserver(() => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth / SCALE));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight / SCALE));
      clouds = makeClouds(canvas.width, Math.round(canvas.height * 0.62));
      blades = makeBlades(canvas.width, Math.round(canvas.height * 0.62), canvas.height);
      draw(lastT);
    });
    observer.observe(canvas);

    let raf = 0;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let nextGustAt = rand(0.5, 2); // first gust arrives quickly
      const loop = (ts: number) => {
        const t = ts / 1000;
        const dt = Math.min(0.05, Math.max(0.001, t - lastT));
        if (t >= nextGustAt) {
          gusts.push(makeGust(t));
          nextGustAt = t + rand(3, 5);
        }
        gusts = gusts.filter((g) => t - g.born < g.decay * 6);
        updateBlades(blades, BASE_BREEZE + gustStrength(gusts, t), t, dt);
        draw(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

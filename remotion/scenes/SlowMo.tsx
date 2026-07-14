import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { boil } from "../boil";
import { Caption, Kicker, Paper } from "../ui";
import { COLORS, FONTS } from "../theme";

const VIEW = { x: 340, y: 170, width: 1240, height: 560 };

// Ball position along a bounce arc, t ∈ [0,1], inside one half-panel.
const arcPos = (t: number, panelX: number, panelW: number) => {
  const x = panelX + 60 + t * (panelW - 120);
  const y = VIEW.y + VIEW.height - 90 - Math.sin(t * Math.PI) * 330;
  return { x, y };
};

const Dot: React.FC<{ x: number; y: number; opacity?: number }> = ({
  x,
  y,
  opacity = 1,
}) => (
  <circle cx={x} cy={y} r={22} fill={COLORS.rust500} stroke={COLORS.ink900} strokeWidth={5} opacity={opacity} />
);

export const SlowMo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const LOOP = 70;
  const t = (frame % LOOP) / LOOP;
  // "Normal speed" = the same motion sampled at a chunky step → jumpy.
  const tChoppy = (Math.floor((frame % LOOP) / 14) * 14) / LOOP;

  const leftPanel = { x: VIEW.x, w: VIEW.width / 2 };
  const rightPanel = { x: VIEW.x + VIEW.width / 2, w: VIEW.width / 2 };

  const choppy = arcPos(tChoppy, leftPanel.x, leftPanel.w);
  const smooth = arcPos(t, rightPanel.x, rightPanel.w);
  const trail = [0.05, 0.1, 0.16].map((d) =>
    arcPos(Math.max(0, t - d), rightPanel.x, rightPanel.w),
  );

  // Camera mode selector: gold pill slides from VIDEO to SLO-MO at f30.
  const slide = spring({ frame: frame - 30, fps, config: { damping: 15 } });
  const MODES = ["PHOTO", "VIDEO", "SLO-MO"];
  const MODE_W = 250;
  const rowX = (1920 - MODES.length * MODE_W) / 2;
  const pillX = rowX + interpolate(slide, [0, 1], [MODE_W, MODE_W * 2]);
  const activeMode = slide > 0.5 ? 2 : 1;

  const badge = spring({ frame: frame - 55, fps, config: { damping: 11, mass: 0.6 } });

  return (
    <Paper>
      <Kicker>RULE 4 · SLOW MOTION</Kicker>
      <AbsoluteFill>
        {/* Viewfinder with the two demo panels */}
        <svg
          style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...boil.a }}
          width={1920}
          height={1080}
        >
          <rect
            x={VIEW.x}
            y={VIEW.y}
            width={VIEW.width}
            height={VIEW.height}
            rx={18}
            fill={COLORS.cream50}
            stroke={COLORS.ink900}
            strokeWidth={6}
          />
          <path
            d={`M${VIEW.x + VIEW.width / 2},${VIEW.y + 24} L${VIEW.x + VIEW.width / 2},${
              VIEW.y + VIEW.height - 24
            }`}
            stroke={COLORS.cream300}
            strokeWidth={5}
            strokeDasharray="18 14"
          />
          {/* Faint guide arcs */}
          {[leftPanel, rightPanel].map((p) => (
            <path
              key={p.x}
              d={`M${p.x + 60},${VIEW.y + VIEW.height - 90} Q${p.x + p.w / 2},${
                VIEW.y + VIEW.height - 90 - 660 * 0.99
              } ${p.x + p.w - 60},${VIEW.y + VIEW.height - 90}`}
              stroke={COLORS.cream300}
              strokeWidth={4}
              fill="none"
            />
          ))}
          <Dot x={choppy.x} y={choppy.y} />
          {trail.map((p, i) => (
            <Dot key={i} x={p.x} y={p.y} opacity={0.16 + i * 0.12} />
          ))}
          <Dot x={smooth.x} y={smooth.y} />
        </svg>

        {/* Panel labels */}
        {[
          { text: "NORMAL", x: leftPanel.x, color: COLORS.rust600 },
          { text: "SLO-MO", x: rightPanel.x, color: COLORS.pitch700 },
        ].map((l) => (
          <div
            key={l.text}
            style={{
              position: "absolute",
              left: l.x,
              top: VIEW.y + 30,
              width: VIEW.width / 2,
              textAlign: "center",
              fontFamily: FONTS.display,
              fontWeight: 600,
              fontSize: 40,
              letterSpacing: "0.16em",
              color: l.color,
              ...boil.b,
            }}
          >
            {l.text}
          </div>
        ))}

        {/* 240 FPS badge */}
        <div
          style={{
            position: "absolute",
            left: VIEW.x + VIEW.width - 120,
            top: VIEW.y - 58,
            transform: `scale(${badge}) rotate(8deg)`,
            backgroundColor: COLORS.gold500,
            color: COLORS.pitch950,
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 42,
            padding: "10px 28px",
            borderRadius: 14,
            border: `5px solid ${COLORS.ink900}`,
            ...boil.b,
          }}
        >
          240 FPS
        </div>

        {/* Camera mode selector */}
        <div
          style={{
            position: "absolute",
            left: pillX,
            top: 790,
            width: MODE_W,
            height: 84,
            borderRadius: 999,
            backgroundColor: COLORS.gold500,
            border: `5px solid ${COLORS.ink900}`,
            ...boil.a,
          }}
        />
        {MODES.map((m, i) => (
          <div
            key={m}
            style={{
              position: "absolute",
              left: rowX + i * MODE_W,
              top: 790,
              width: MODE_W,
              height: 84,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONTS.display,
              fontWeight: 600,
              fontSize: 40,
              letterSpacing: "0.1em",
              color: i === activeMode ? COLORS.pitch950 : COLORS.ink600,
              ...boil.b,
            }}
          >
            {m}
          </div>
        ))}
      </AbsoluteFill>
      <Caption enterAt={95} size={56}>
        Shoot in slow-mo — the highest frame rate your phone has.
      </Caption>
    </Paper>
  );
};

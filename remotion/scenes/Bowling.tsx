import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  Ball,
  BowlerDelivery,
  BowlerFollowThrough,
  BowlerRun,
  Cone,
  Scissors,
  Stumps,
} from "../assets/placeholders";
import { boil } from "../boil";
import { Caption, Kicker, Paper } from "../ui";
import { COLORS, FONTS } from "../theme";

const GROUND_Y = 780;
const BOWLER_SIZE = 320; // ground at 380 in a 400 viewBox → feet at y ≈ 304·scale
const BOWLER_TOP = GROUND_Y - (380 / 400) * BOWLER_SIZE;

// Film strip geometry (the "recorded clip" metaphor at the bottom).
const STRIP = { x: 260, y: 916, width: 1400, height: 96 };
const TRIM_RATIO = 0.74; // follow-through lands ~3/4 into the recorded clip
const TRIM_X = STRIP.x + STRIP.width * TRIM_RATIO;

export const Bowling: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Run-up f10–95 → delivery f95–120 → follow-through f120–145 → freeze.
  const phase =
    frame < 95 ? "run" : frame < 120 ? "delivery" : ("follow" as const);
  const runX = interpolate(frame, [10, 95], [140, 1140], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });
  const followX = interpolate(frame, [120, 145], [1140, 1260], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const bowlerX = phase === "follow" ? followX : runX;
  const runStep = (Math.floor(frame / 6) % 2) as 0 | 1;

  // Ball released at f112, flies toward the stumps.
  const ballT = interpolate(frame, [112, 132], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ballX = interpolate(ballT, [0, 1], [1310, 1600]);
  const ballY = interpolate(ballT, [0, 1], [470, 730], {
    easing: Easing.in(Easing.quad),
  });

  // The trim beat: playhead tracks the bowler, then scissors cut the tail off.
  const playheadX = interpolate(frame, [10, 148], [STRIP.x, TRIM_X], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cut = spring({ frame: frame - 165, fps, config: { damping: 14 } });
  const stripIn = interpolate(frame, [6, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sprockets = Array.from({ length: 22 }, (_, i) => STRIP.x + 22 + i * 63);

  return (
    <Paper>
      <Kicker>RULE 3 · BOWLING</Kicker>
      <AbsoluteFill>
        {/* Ground line, run-up marker, stumps */}
        <svg
          style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...boil.b }}
          width={1920}
          height={1080}
        >
          <path
            d={`M100,${GROUND_Y + 26} L1820,${GROUND_Y + 26}`}
            stroke={COLORS.sage400}
            strokeWidth={6}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: "absolute", left: 180, top: GROUND_Y - 44, ...boil.a }}>
          <Cone size={74} />
        </div>
        <div style={{ position: "absolute", left: 1560, top: GROUND_Y - 148, ...boil.a }}>
          <Stumps size={130} />
        </div>

        {/* Bowler */}
        <div
          style={{
            position: "absolute",
            left: bowlerX,
            top: BOWLER_TOP,
            ...boil.a,
          }}
        >
          {phase === "run" && <BowlerRun size={BOWLER_SIZE} step={runStep} />}
          {phase === "delivery" && <BowlerDelivery size={BOWLER_SIZE} />}
          {phase === "follow" && <BowlerFollowThrough size={BOWLER_SIZE} />}
        </div>

        {frame >= 112 && frame < 136 && (
          <div style={{ position: "absolute", left: ballX, top: ballY, ...boil.b }}>
            <Ball size={54} />
          </div>
        )}

        {/* Film strip = the recorded clip */}
        <div style={{ opacity: stripIn }}>
          <svg
            style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...boil.a }}
            width={1920}
            height={1080}
          >
            {/* Kept part of the clip */}
            <g>
              <rect
                x={STRIP.x}
                y={STRIP.y}
                width={STRIP.width * TRIM_RATIO}
                height={STRIP.height}
                fill={COLORS.cream50}
                stroke={COLORS.ink900}
                strokeWidth={5}
              />
              {sprockets
                .filter((sx) => sx < TRIM_X - 24)
                .map((sx) => (
                  <React.Fragment key={sx}>
                    <rect x={sx} y={STRIP.y + 12} width={16} height={14} fill={COLORS.ink600} />
                    <rect
                      x={sx}
                      y={STRIP.y + STRIP.height - 26}
                      width={16}
                      height={14}
                      fill={COLORS.ink600}
                    />
                  </React.Fragment>
                ))}
            </g>
            {/* Discarded tail — tilts and falls away when the scissors cut */}
            <g
              transform={`translate(${cut * 36}, ${cut * 110}) rotate(${cut * 9}, ${TRIM_X}, ${
                STRIP.y + STRIP.height
              })`}
              opacity={1 - cut * 0.75}
            >
              <rect
                x={TRIM_X}
                y={STRIP.y}
                width={STRIP.width * (1 - TRIM_RATIO)}
                height={STRIP.height}
                fill={cut > 0.05 ? COLORS.cream200 : COLORS.cream50}
                stroke={cut > 0.05 ? COLORS.rust600 : COLORS.ink900}
                strokeWidth={5}
              />
              {sprockets
                .filter((sx) => sx > TRIM_X + 8)
                .map((sx) => (
                  <React.Fragment key={sx}>
                    <rect x={sx} y={STRIP.y + 12} width={16} height={14} fill={COLORS.ink600} />
                    <rect
                      x={sx}
                      y={STRIP.y + STRIP.height - 26}
                      width={16}
                      height={14}
                      fill={COLORS.ink600}
                    />
                  </React.Fragment>
                ))}
            </g>
            {/* Playhead */}
            <path
              d={`M${playheadX},${STRIP.y - 14} L${playheadX},${STRIP.y + STRIP.height + 14}`}
              stroke={COLORS.gold600}
              strokeWidth={7}
              strokeLinecap="round"
            />
            {/* Trim line appears at the cut */}
            {frame >= 150 && (
              <path
                d={`M${TRIM_X},${STRIP.y - 22} L${TRIM_X},${STRIP.y + STRIP.height + 22}`}
                stroke={COLORS.rust600}
                strokeWidth={6}
                strokeDasharray="16 12"
                strokeLinecap="round"
              />
            )}
          </svg>
          {frame >= 152 && (
            <div
              style={{
                position: "absolute",
                left: TRIM_X - 46,
                top: STRIP.y - 106,
                transform: `rotate(${90 + cut * 24}deg)`,
                ...boil.b,
              }}
            >
              <Scissors size={92} />
            </div>
          )}
          <div
            style={{
              position: "absolute",
              left: STRIP.x,
              top: STRIP.y - 54,
              fontFamily: FONTS.display,
              fontWeight: 600,
              fontSize: 32,
              letterSpacing: "0.16em",
              color: COLORS.ink600,
              ...boil.b,
            }}
          >
            YOUR CLIP
          </div>
        </div>
      </AbsoluteFill>
      <Caption enterAt={12} exitAt={144} size={56} placement="top">
        Capture the whole run-up…
      </Caption>
      <Caption enterAt={156} size={56} placement="top">
        …and cut the clip right after the follow-through step.
      </Caption>
    </Paper>
  );
};

import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BatsmanBacklift,
  BatsmanFollowThrough,
  BatsmanStance,
} from "../assets/placeholders";
import { boil } from "../boil";
import { CameraFrame, Caption, CheckMark, CrossMark, Kicker, Paper } from "../ui";
import { COLORS } from "../theme";

const FIGURE = { x: 610, y: 330, size: 500 };

// Tight framing crops the raised bat; wide framing contains the full swing.
const TIGHT = { x: 660, y: 340, width: 460, height: 490 };
const WIDE = { x: 480, y: 150, width: 760, height: 700 };

export const Batting: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pose flipbook: stance → backlift (escapes tight frame) → reset → full swing.
  const pose =
    frame < 40
      ? "stance"
      : frame < 100
        ? "backlift"
        : frame < 150
          ? "stance"
          : frame < 195
            ? "backlift"
            : "follow";

  const alarm = frame >= 48 && frame < 95;

  // Frame widens with a spring at f95.
  const widen = spring({ frame: frame - 95, fps, config: { damping: 15 } });
  const rect = {
    x: interpolate(widen, [0, 1], [TIGHT.x, WIDE.x]),
    y: interpolate(widen, [0, 1], [TIGHT.y, WIDE.y]),
    width: interpolate(widen, [0, 1], [TIGHT.width, WIDE.width]),
    height: interpolate(widen, [0, 1], [TIGHT.height, WIDE.height]),
  };

  const figureIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Paper>
      <Kicker>RULE 2 · BATTING</Kicker>
      <AbsoluteFill>
        {/* Ground line under the batsman */}
        <svg
          style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...boil.b }}
          width={1920}
          height={1080}
        >
          <path
            d="M420,806 L1300,806"
            stroke={COLORS.sage400}
            strokeWidth={6}
            strokeLinecap="round"
          />
        </svg>

        <div
          style={{
            position: "absolute",
            left: FIGURE.x,
            top: FIGURE.y,
            opacity: figureIn,
            ...boil.a,
          }}
        >
          {pose === "stance" && <BatsmanStance size={FIGURE.size} />}
          {pose === "backlift" && <BatsmanBacklift size={FIGURE.size} />}
          {pose === "follow" && <BatsmanFollowThrough size={FIGURE.size} />}
        </div>

        <CameraFrame {...rect} alarm={alarm} />

        {/* Bat tip escapes the tight frame → cross near the tip */}
        <CrossMark
          enterAt={55}
          exitAt={92}
          size={120}
          style={{ position: "absolute", left: 1010, top: 200 }}
        />
        {/* Full swing stays inside the wide frame → check */}
        <CheckMark
          enterAt={205}
          size={150}
          style={{ position: "absolute", left: 1300, top: 230 }}
        />
      </AbsoluteFill>
      <Caption enterAt={12}>Keep the whole bat in view — the whole time.</Caption>
    </Paper>
  );
};

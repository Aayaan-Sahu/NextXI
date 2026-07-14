import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Ball } from "../assets/placeholders";
import { boil } from "../boil";
import { Paper } from "../ui";
import { COLORS, FONTS, VIDEO } from "../theme";

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame: frame - 5, fps, config: { damping: 200 } });
  const subIn = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const underline = interpolate(frame, [18, 40], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ball rolls across the bottom of the screen.
  const ballX = interpolate(frame, [10, 80], [-160, VIDEO.width + 160], {
    extrapolateRight: "clamp",
  });

  return (
    <Paper>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 170,
            letterSpacing: "0.02em",
            color: COLORS.pitch950,
            opacity: titleIn,
            transform: `scale(${0.9 + titleIn * 0.1})`,
            ...boil.a,
          }}
        >
          RECORD IT RIGHT
        </div>
        <svg width={760} height={30} style={{ overflow: "visible", ...boil.b }}>
          <path
            d="M10,15 C200,4 560,26 750,12"
            stroke={COLORS.gold500}
            strokeWidth={10}
            strokeLinecap="round"
            fill="none"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={underline}
          />
        </svg>
        <div
          style={{
            fontFamily: FONTS.sans,
            fontSize: 44,
            color: COLORS.ink600,
            opacity: subIn,
            ...boil.a,
          }}
        >
          Four rules for footage the AI can actually read.
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: 60, left: ballX, ...boil.b }}>
        <Ball size={110} style={{ transform: `rotate(${ballX * 0.6}deg)` }} />
      </div>
    </Paper>
  );
};

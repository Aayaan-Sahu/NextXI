import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { boil } from "../boil";
import { CheckMark, Paper } from "../ui";
import { COLORS, FONTS } from "../theme";

const ITEMS = [
  "Horizontal, always",
  "Whole bat in frame, whole time",
  "Full run-up — cut after the follow-through",
  "Slow motion on",
];

const Row: React.FC<{ text: string; enterAt: number }> = ({ text, enterAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - enterAt, fps, config: { damping: 200 } });
  if (frame < enterAt) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 40,
        opacity: enter,
        transform: `translateX(${(1 - enter) * -60}px)`,
      }}
    >
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <svg viewBox="0 0 72 72" width={72} height={72} style={{ ...boil.a }}>
          <rect
            x={6}
            y={6}
            width={60}
            height={60}
            rx={10}
            stroke={COLORS.ink900}
            strokeWidth={6}
            fill={COLORS.cream50}
          />
        </svg>
        <CheckMark
          enterAt={enterAt + 8}
          size={84}
          style={{ position: "absolute", left: 2, top: -14 }}
        />
      </div>
      <div
        style={{
          fontFamily: FONTS.display,
          fontWeight: 600,
          fontSize: 60,
          color: COLORS.pitch950,
          ...boil.a,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const Recap: React.FC = () => {
  const frame = useCurrentFrame();

  const titleIn = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outroIn = interpolate(frame, [140, 155], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Paper>
      <AbsoluteFill style={{ alignItems: "center" }}>
        <div
          style={{
            marginTop: 90,
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 104,
            letterSpacing: "0.04em",
            color: COLORS.pitch950,
            opacity: titleIn,
            ...boil.a,
          }}
        >
          THE CHECKLIST
        </div>
        <div
          style={{
            marginTop: 70,
            display: "flex",
            flexDirection: "column",
            gap: 46,
            width: 1150,
          }}
        >
          {ITEMS.map((text, i) => (
            <Row key={text} text={text} enterAt={22 + i * 24} />
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 56,
            fontFamily: FONTS.display,
            fontWeight: 600,
            fontSize: 36,
            letterSpacing: "0.24em",
            color: COLORS.gold600,
            opacity: outroIn,
            ...boil.b,
          }}
        >
          NEXTXI
        </div>
      </AbsoluteFill>
    </Paper>
  );
};

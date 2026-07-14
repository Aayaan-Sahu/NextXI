import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Phone } from "../assets/placeholders";
import { boil } from "../boil";
import { Caption, CheckMark, CrossMark, Kicker, Paper } from "../ui";
import { COLORS, FONTS } from "../theme";

export const Orientation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Portrait for the first 55 frames, then springs 90° into landscape.
  const rotation = spring({ frame: frame - 55, fps, config: { damping: 16 } }) * -90;
  const landscape = frame >= 55;

  return (
    <Paper>
      <Kicker>RULE 1 · ORIENTATION</Kicker>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ transform: `rotate(${rotation}deg)`, ...boil.a }}>
          <Phone size={260} />
        </div>

        {/* Portrait = wrong */}
        <CrossMark
          enterAt={18}
          exitAt={52}
          size={150}
          style={{ position: "absolute", transform: "translate(230px, -190px)" }}
        />
        {/* Landscape = right */}
        <CheckMark
          enterAt={92}
          size={160}
          style={{ position: "absolute", transform: "translate(330px, -190px)" }}
        />

        {/* Labels under the phone */}
        <div
          style={{
            position: "absolute",
            bottom: 240,
            fontFamily: FONTS.display,
            fontWeight: 600,
            fontSize: 42,
            letterSpacing: "0.14em",
            color: landscape ? COLORS.pitch700 : COLORS.rust600,
            opacity: interpolate(frame, [12, 22], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            ...boil.b,
          }}
        >
          {landscape ? "LANDSCAPE" : "PORTRAIT"}
        </div>
      </AbsoluteFill>
      <Caption enterAt={100}>Always shoot horizontal.</Caption>
    </Paper>
  );
};

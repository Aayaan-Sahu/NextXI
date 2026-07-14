import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { boil, BoilFilters } from "./boil";
import { COLORS, FONTS } from "./theme";

/** Scene backdrop: cream paper + boil filter defs, shared by every scene. */
export const Paper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: COLORS.cream100 }}>
    <BoilFilters />
    {children}
  </AbsoluteFill>
);

/** Small gold uppercase rule label, top-left. */
export const Kicker: React.FC<{ children: string; enterAt?: number }> = ({
  children,
  enterAt = 0,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [enterAt, enterAt + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 64,
        left: 80,
        fontFamily: FONTS.display,
        fontWeight: 600,
        fontSize: 40,
        letterSpacing: "0.18em",
        color: COLORS.gold600,
        opacity,
        ...boil.b,
      }}
    >
      {children}
    </div>
  );
};

/** Main caption, bottom-centre. Springs up; swap text by rendering two with enter/exit. */
export const Caption: React.FC<{
  children: React.ReactNode;
  enterAt?: number;
  exitAt?: number;
  size?: number;
  placement?: "bottom" | "top";
}> = ({ children, enterAt = 0, exitAt, size = 62, placement = "bottom" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - enterAt, fps, config: { damping: 200 } });
  const exit =
    exitAt === undefined
      ? 0
      : interpolate(frame, [exitAt, exitAt + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  if (frame < enterAt) return null;
  return (
    <div
      style={{
        position: "absolute",
        ...(placement === "bottom" ? { bottom: 72 } : { top: 150 }),
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: enter * (1 - exit),
        transform: `translateY(${(1 - enter) * (placement === "bottom" ? 40 : -40)}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.display,
          fontWeight: 600,
          fontSize: size,
          color: COLORS.pitch950,
          textAlign: "center",
          maxWidth: 1500,
          lineHeight: 1.15,
          ...boil.a,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Gold check mark that draws itself in. */
export const CheckMark: React.FC<{
  size?: number;
  enterAt?: number;
  style?: React.CSSProperties;
}> = ({ size = 140, enterAt = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - enterAt, fps, config: { damping: 12, mass: 0.6 } });
  const draw = interpolate(frame, [enterAt, enterAt + 12], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame < enterAt) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ transform: `scale(${pop})`, overflow: "visible", ...boil.b, ...style }}
    >
      <path
        d="M18,54 L42,78 L84,24"
        stroke={COLORS.gold600}
        strokeWidth={13}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={draw}
      />
    </svg>
  );
};

/** Rust cross mark that stamps in. */
export const CrossMark: React.FC<{
  size?: number;
  enterAt?: number;
  exitAt?: number;
  style?: React.CSSProperties;
}> = ({ size = 140, enterAt = 0, exitAt, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - enterAt, fps, config: { damping: 12, mass: 0.6 } });
  const exit =
    exitAt === undefined
      ? 0
      : interpolate(frame, [exitAt, exitAt + 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  if (frame < enterAt) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{
        transform: `scale(${pop})`,
        opacity: 1 - exit,
        overflow: "visible",
        ...boil.b,
        ...style,
      }}
    >
      <path
        d="M24,24 L76,76 M76,24 L24,76"
        stroke={COLORS.rust600}
        strokeWidth={13}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};

/**
 * Boiling camera-frame rectangle with corner brackets — reads as "what the
 * phone sees". Position/size are animated by the parent via plain props.
 */
export const CameraFrame: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  alarm?: boolean; // flash the frame rust-red (bat escaped!)
}> = ({ x, y, width, height, color = COLORS.pitch800, alarm = false }) => {
  const frame = useCurrentFrame();
  const alarmOn = alarm && Math.floor(frame / 5) % 2 === 0;
  const stroke = alarmOn ? COLORS.rust600 : color;
  const b = 54; // corner bracket length
  return (
    <svg
      style={{
        position: "absolute",
        left: x,
        top: y,
        overflow: "visible",
        ...boil.strong,
      }}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        stroke={stroke}
        strokeWidth={5}
        strokeDasharray="26 18"
        fill="none"
      />
      {[
        `M0,${b} L0,0 L${b},0`,
        `M${width - b},0 L${width},0 L${width},${b}`,
        `M${width},${height - b} L${width},${height} L${width - b},${height}`,
        `M${b},${height} L0,${height} L0,${height - b}`,
      ].map((d) => (
        <path key={d} d={d} stroke={stroke} strokeWidth={11} fill="none" strokeLinecap="round" />
      ))}
      <circle cx={width - 36} cy={38} r={11} fill={alarmOn ? COLORS.rust600 : COLORS.rust500} />
    </svg>
  );
};

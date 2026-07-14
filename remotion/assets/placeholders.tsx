import React from "react";
import { COLORS } from "../theme";

/**
 * PLACEHOLDER ART
 * ---------------
 * Every component in this file is a stand-in line drawing. To swap in real
 * artwork later, export each Procreate drawing as a transparent PNG, drop it
 * in `public/tutorial/`, and replace a component's SVG body with:
 *
 *   <Img src={staticFile("tutorial/batsman-stance.png")} style={{ width: size }} />
 *
 * Keep the same component name/props and the scenes won't need to change.
 * Figures share a 400×400 viewBox with the ground line at y≈380, feet on the
 * ground, so poses can be hot-swapped frame-to-frame (flipbook style).
 * `overflow: visible` is intentional — the backlift bat tip pokes past the
 * viewBox on purpose (the batting scene uses it to break the camera frame).
 */

type AssetProps = {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
};

const figureSvg = (
  size: number,
  style: React.CSSProperties | undefined,
  children: React.ReactNode,
) => (
  <svg
    viewBox="0 0 400 400"
    width={size}
    height={size}
    style={{ overflow: "visible", display: "block", ...style }}
  >
    {children}
  </svg>
);

const limb = (d: string, color: string, width = 7): React.ReactElement => (
  <path
    d={d}
    stroke={color}
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
  />
);

const head = (cx: number, cy: number, color: string): React.ReactElement => (
  <circle cx={cx} cy={cy} r={26} stroke={color} strokeWidth={7} fill="none" />
);

/* ------------------------------- Batsman ------------------------------- */

export const BatsmanStance: React.FC<AssetProps> = ({
  size = 400,
  color = COLORS.ink900,
  style,
}) =>
  figureSvg(size, style, (
    <>
      {head(210, 90, color)}
      {limb("M210,116 L206,235", color)}
      {limb("M206,235 L172,300 L165,375", color)}
      {limb("M206,235 L238,305 L246,375", color)}
      {limb("M203,142 L162,210", color)}
      {limb("M210,150 L168,220", color)}
      {/* bat */}
      {limb("M162,212 L150,345", color, 17)}
    </>
  ));

export const BatsmanBacklift: React.FC<AssetProps> = ({
  size = 400,
  color = COLORS.ink900,
  style,
}) =>
  figureSvg(size, style, (
    <>
      {head(200, 95, color)}
      {limb("M200,121 L196,240", color)}
      {limb("M196,240 L160,305 L152,378", color)}
      {limb("M196,240 L230,308 L240,378", color)}
      {limb("M198,150 L252,152", color)}
      {limb("M204,160 L256,164", color)}
      {/* bat raised — tip intentionally exits the 400px viewBox */}
      {limb("M254,152 L332,-18", color, 17)}
    </>
  ));

export const BatsmanFollowThrough: React.FC<AssetProps> = ({
  size = 400,
  color = COLORS.ink900,
  style,
}) =>
  figureSvg(size, style, (
    <>
      {head(195, 92, color)}
      {limb("M195,118 L200,238", color)}
      {limb("M200,238 L162,300 L150,376", color)}
      {limb("M200,238 L236,300 L248,376", color)}
      {limb("M196,148 L142,142", color)}
      {limb("M200,158 L146,152", color)}
      {/* bat swung through, up and across */}
      {limb("M142,142 L48,60", color, 17)}
    </>
  ));

/* -------------------------------- Bowler ------------------------------- */

export const BowlerRun: React.FC<AssetProps & { step?: 0 | 1 }> = ({
  size = 400,
  color = COLORS.ink900,
  style,
  step = 0,
}) =>
  figureSvg(size, style, (
    <>
      {head(230, 90, color)}
      {limb("M226,114 L200,230", color)}
      {step === 0 ? (
        <>
          {limb("M200,230 L258,290 L262,368", color)}
          {limb("M200,230 L150,290 L120,350", color)}
          {limb("M220,140 L275,180", color)}
          {limb("M218,142 L160,190", color)}
        </>
      ) : (
        <>
          {limb("M200,230 L240,300 L226,375", color)}
          {limb("M200,230 L165,295 L180,372", color)}
          {limb("M220,140 L268,110", color)}
          {limb("M218,145 L170,200", color)}
        </>
      )}
    </>
  ));

export const BowlerDelivery: React.FC<AssetProps> = ({
  size = 400,
  color = COLORS.ink900,
  style,
}) =>
  figureSvg(size, style, (
    <>
      {head(200, 95, color)}
      {limb("M200,120 L205,235", color)}
      {/* bowling arm straight up, ball at the hand */}
      {limb("M202,135 L212,20", color)}
      <circle cx={215} cy={8} r={11} stroke={color} strokeWidth={6} fill={COLORS.rust500} />
      {limb("M200,140 L150,200", color)}
      {limb("M205,235 L190,310 L188,378", color)}
      {limb("M205,235 L260,300 L285,360", color)}
    </>
  ));

export const BowlerFollowThrough: React.FC<AssetProps> = ({
  size = 400,
  color = COLORS.ink900,
  style,
}) =>
  figureSvg(size, style, (
    <>
      {head(250, 120, color)}
      {limb("M242,142 L205,250", color)}
      {limb("M235,155 L180,260", color)}
      {limb("M238,158 L295,210", color)}
      {limb("M205,250 L250,310 L255,378", color)}
      {limb("M205,250 L160,300 L140,365", color)}
    </>
  ));

/* --------------------------------- Props -------------------------------- */

export const Ball: React.FC<AssetProps> = ({
  size = 100,
  color = COLORS.ink900,
  style,
}) => (
  <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", ...style }}>
    <circle cx={50} cy={50} r={40} stroke={color} strokeWidth={6} fill={COLORS.rust500} />
    <path
      d="M32,18 C58,42 58,58 32,82"
      stroke={COLORS.cream50}
      strokeWidth={4}
      strokeDasharray="7 6"
      fill="none"
    />
  </svg>
);

export const Phone: React.FC<AssetProps & { screen?: React.ReactNode }> = ({
  size = 240,
  color = COLORS.ink900,
  style,
  screen,
}) => (
  <svg
    viewBox="0 0 240 460"
    width={size}
    height={(size / 240) * 460}
    style={{ display: "block", ...style }}
  >
    <rect
      x={10}
      y={10}
      width={220}
      height={440}
      rx={34}
      stroke={color}
      strokeWidth={9}
      fill={COLORS.cream50}
    />
    <rect x={30} y={54} width={180} height={352} rx={8} fill={COLORS.cream200} />
    <circle cx={120} cy={32} r={6} fill={color} />
    {screen}
  </svg>
);

export const Stumps: React.FC<AssetProps> = ({
  size = 120,
  color = COLORS.ink900,
  style,
}) => (
  <svg
    viewBox="0 0 120 160"
    width={size}
    height={(size / 120) * 160}
    style={{ display: "block", ...style }}
  >
    {limb("M22,24 L22,152", color, 9)}
    {limb("M60,24 L60,152", color, 9)}
    {limb("M98,24 L98,152", color, 9)}
    {limb("M18,16 L58,16", color, 7)}
    {limb("M62,16 L102,16", color, 7)}
  </svg>
);

export const Scissors: React.FC<AssetProps> = ({
  size = 100,
  color = COLORS.ink900,
  style,
}) => (
  <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", ...style }}>
    {limb("M28,32 L88,72", color, 7)}
    {limb("M28,68 L88,28", color, 7)}
    <circle cx={17} cy={26} r={11} stroke={color} strokeWidth={7} fill="none" />
    <circle cx={17} cy={74} r={11} stroke={color} strokeWidth={7} fill="none" />
  </svg>
);

export const Cone: React.FC<AssetProps> = ({
  size = 70,
  color = COLORS.ink900,
  style,
}) => (
  <svg viewBox="0 0 70 70" width={size} height={size} style={{ display: "block", ...style }}>
    <path
      d="M35,8 L52,58 L18,58 Z"
      stroke={color}
      strokeWidth={6}
      strokeLinejoin="round"
      fill={COLORS.gold500}
    />
    <path d="M10,62 L60,62" stroke={color} strokeWidth={6} strokeLinecap="round" />
  </svg>
);

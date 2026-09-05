// Generated from shared/theme.css by `bun run tokens`. Do not edit.
//
// shared/theme.css is the one definition of these tokens and the web imports
// it directly; this module is that file compiled for React Native, which
// cannot read CSS. lib/theme.test.ts fails if the two drift apart.

/** The Crease palette. Roles and rules are in STYLE-GUIDE.md. */
export const colors = {
  "pitch-950": "#171310",
  "pitch-900": "#241c15",
  "pitch-800": "#2c2620",
  "pitch-700": "#38312a",
  "olive-950": "#1b2118",
  "olive-800": "#2e3b2a",
  "olive-700": "#374332",
  "cream-50": "#fffcf5",
  "cream-100": "#f8f2e7",
  "cream-200": "#f3ebdd",
  "cream-250": "#efead9",
  "cream-300": "#ede4d4",
  "cream-350": "#e4dac6",
  "cream-400": "#e0d6c3",
  "cream-450": "#dcd3c0",
  "cream-500": "#cfc3aa",
  "rust-50": "#f7e2de",
  "rust-100": "#fdf6f4",
  "rust-300": "#c68c84",
  "rust-500": "#c2503f",
  "rust-600": "#8a2116",
  "rust-700": "#6f1b1b",
  "rust-800": "#5e1710",
  "amber-500": "#e8a92e",
  "gold-500": "#f2c79b",
  "gold-600": "#e5b482",
  "ink-900": "#241c15",
  "ink-800": "#3b332b",
  "ink-600": "#6b6155",
  "ink-400": "#a2937c",
  "moss-600": "#2f6b3e",
} as const;

/** The nine type roles, line heights resolved to pixels for React Native. */
export const typeRoles = {
  display: { fontSize: 30, lineHeight: 36 },
  title: { fontSize: 20, lineHeight: 25 },
  lead: { fontSize: 17, lineHeight: 27.2 },
  body: { fontSize: 15, lineHeight: 24 },
  ui: { fontSize: 14, lineHeight: 21 },
  caption: { fontSize: 13, lineHeight: 18.85 },
  micro: { fontSize: 11, lineHeight: 14.3 },
  figure: { fontSize: 28, lineHeight: 33.6 },
  "figure-sm": { fontSize: 20, lineHeight: 24 },
} as const;

/**
 * The two faces, by the exact names app/_layout.tsx registers them under —
 * React Native resolves a font by its registered name. One family per weight,
 * because `fontWeight` on a custom family is unreliable on Android.
 */
export const fonts = {
  sans: "PublicSans_400Regular",
  sansSemibold: "PublicSans_600SemiBold",
  sansBold: "PublicSans_700Bold",
  display: "SairaCondensed_700Bold",
} as const;

export type ColorToken = keyof typeof colors;
export type TypeRole = keyof typeof typeRoles;

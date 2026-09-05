import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Generates mobile/lib/theme.ts from shared/theme.css.
 *
 * shared/theme.css is the single definition of the Crease tokens: the web
 * imports it directly as Tailwind v4 theme variables. React Native cannot
 * read CSS, so the same file is compiled to a typed TypeScript module here
 * rather than retyped by hand — a second hand-maintained copy is exactly how
 * two clients drift apart.
 *
 * `bun run tokens` rewrites the module; lib/theme.test.ts fails if the
 * committed file no longer matches the CSS, so a token added on the web
 * cannot silently skip the app.
 */

export const THEME_CSS_PATH = join(import.meta.dir, "..", "..", "shared", "theme.css");

export function readThemeCss(): string {
  return readFileSync(THEME_CSS_PATH, "utf8");
}

/** `--color-cream-200: #f3ebdd;` → `["cream-200", "#f3ebdd"]`, in file order. */
function colors(css: string): [string, string][] {
  return [...css.matchAll(/--color-([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
    name,
    value.trim(),
  ]);
}

/**
 * CSS line-height only ever spaces lines apart — a browser always draws a
 * glyph's full ascender/descender regardless of how tight the ratio is, so
 * shared/theme.css's tightest ratios (display: 1.05, figure/figure-sm: 1)
 * are perfectly safe there. React Native's `lineHeight` instead sets a hard
 * line box and can visibly clip a custom font's cap-height when that box is
 * tighter than the glyph needs — most visible on the bold, condensed
 * display face at its largest size. This is a React Native rendering floor,
 * not a design change: it never lowers a ratio the web already uses, only
 * raises the ones too tight for RN to render without clipping.
 */
const RN_MIN_LINE_HEIGHT_RATIO = 1.2;

/**
 * The nine type roles. CSS carries a unitless line-height multiplier; React
 * Native wants absolute pixels, so it is resolved here — the one conversion
 * between the two runtimes, done once instead of at every call site.
 */
function typeRoles(css: string): [string, { fontSize: number; lineHeight: number }][] {
  const sizes = new Map<string, number>();
  for (const [, name, px] of css.matchAll(/--text-([\w-]+):\s*(\d+(?:\.\d+)?)px;/g)) {
    sizes.set(name, Number(px));
  }
  const ratios = new Map<string, number>();
  for (const [, name, ratio] of css.matchAll(
    /--text-([\w-]+)--line-height:\s*(\d+(?:\.\d+)?);/g,
  )) {
    ratios.set(name, Number(ratio));
  }

  return [...sizes].map(([name, fontSize]) => {
    const ratio = ratios.get(name);
    if (ratio === undefined) throw new Error(`Type role "${name}" has no line height.`);
    const rnRatio = Math.max(ratio, RN_MIN_LINE_HEIGHT_RATIO);
    return [name, { fontSize, lineHeight: Math.round(fontSize * rnRatio * 100) / 100 }];
  });
}

function quote(name: string) {
  return /^[a-z][\w]*$/i.test(name) ? name : JSON.stringify(name);
}

export function generateTheme(css: string): string {
  const colorLines = colors(css)
    .map(([name, value]) => `  ${quote(name)}: "${value}",`)
    .join("\n");
  const typeLines = typeRoles(css)
    .map(
      ([name, { fontSize, lineHeight }]) =>
        `  ${quote(name)}: { fontSize: ${fontSize}, lineHeight: ${lineHeight} },`,
    )
    .join("\n");

  return `// Generated from shared/theme.css by \`bun run tokens\`. Do not edit.
//
// shared/theme.css is the one definition of these tokens and the web imports
// it directly; this module is that file compiled for React Native, which
// cannot read CSS. lib/theme.test.ts fails if the two drift apart.

/** The Crease palette. Roles and rules are in STYLE-GUIDE.md. */
export const colors = {
${colorLines}
} as const;

/** The nine type roles, line heights resolved to pixels for React Native. */
export const typeRoles = {
${typeLines}
} as const;

/**
 * The two faces, by the exact names app/_layout.tsx registers them under —
 * React Native resolves a font by its registered name. One family per weight,
 * because \`fontWeight\` on a custom family is unreliable on Android.
 */
export const fonts = {
  sans: "PublicSans_400Regular",
  sansSemibold: "PublicSans_600SemiBold",
  sansBold: "PublicSans_700Bold",
  display: "SairaCondensed_700Bold",
} as const;

export type ColorToken = keyof typeof colors;
export type TypeRole = keyof typeof typeRoles;
`;
}

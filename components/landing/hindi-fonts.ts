import { Hind, Khand } from "next/font/google";

/**
 * Devanagari faces for the Hindi landing page, standing in for Public Sans
 * and Saira Condensed role for role: Hind is the humanist text face, Khand the
 * condensed headline face — same foundry, drawn to pair, so the page keeps
 * its athletic register instead of falling back to the system's Devanagari.
 *
 * `preload: false` is the whole trick for the English page: the @font-face
 * rules ship, but a browser only fetches a face once an element actually uses
 * it, and nothing outside `[lang="hi"]` ever does. English visitors download
 * nothing extra.
 */
export const hind = Hind({
  subsets: ["devanagari", "latin"],
  variable: "--font-hind",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

export const khand = Khand({
  subsets: ["devanagari", "latin"],
  variable: "--font-khand",
  weight: ["500", "600", "700"],
  preload: false,
});

export const hindiFontVars = `${hind.variable} ${khand.variable}`;

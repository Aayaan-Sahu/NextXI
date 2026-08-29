import { loadFont as loadSaira } from "@remotion/google-fonts/SairaCondensed";
import { loadFont as loadPublicSans } from "@remotion/google-fonts/PublicSans";

const saira = loadSaira("normal", { weights: ["600", "700"], subsets: ["latin"] });
const publicSans = loadPublicSans("normal", { weights: ["400"], subsets: ["latin"] });

// NextXI brand tokens — mirror of app/globals.css @theme.
export const COLORS = {
  pitch950: "#0e1c14",
  pitch900: "#13261c",
  pitch800: "#1e3527",
  pitch700: "#24402f",
  cream50: "#fdfbf4",
  cream100: "#f6f3e9",
  cream200: "#efead9",
  cream300: "#e4dec9",
  gold500: "#e8a92e",
  gold600: "#d0951f",
  rust500: "#e07a5f",
  rust600: "#b23a26",
  ink900: "#16221b",
  ink600: "#6e7a70",
  sage400: "#a9b3a8",
} as const;

export const FONTS = {
  display: saira.fontFamily,
  sans: publicSans.fontFamily,
} as const;

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

/**
 * The product tutorials are 720p because that is exactly what the capture is:
 * scripts/capture-tutorial.mjs films a 1280×720 browser 1:1, and Playwright
 * only ever scales a frame down, never up. Composing at 1080p would upscale
 * the product's own type — the one thing in these films that has to stay
 * legible.
 */
export const TUTORIAL_VIDEO = {
  width: 1280,
  height: 720,
  fps: 30,
} as const;

/** Title card, end card, and the longest a caption stays up (5s). */
export const TUTORIAL = {
  title: 90,
  end: 75,
  captionMax: 150,
} as const;

// Scene durations in frames (30fps).
export const SCENES = {
  hook: 120,
  orientation: 180,
  batting: 240,
  bowling: 260,
  slowmo: 180,
  recap: 180,
} as const;

export const TOTAL_DURATION = Object.values(SCENES).reduce((a, b) => a + b, 0);

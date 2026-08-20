/**
 * The landing page's two shared text primitives.
 *
 * The landing register differs from the product in scale and nothing else, and
 * the scale difference is confined to the two pinned heroes (`ball-hero`,
 * `hero-scrub-video`), where display type runs full-viewport over video. Every
 * band below the fold uses the product's own roles.
 *
 * These exist because the bands drifted: six different section-head sizes
 * (`text-[32px] sm:text-5xl`, `text-3xl sm:text-4xl`, `text-4xl sm:text-5xl`,
 * `text-2xl`, `text-xl`, `text-lg`) and five body sizes across seven files. One
 * component per role means the next band can't invent a seventh.
 */

import type { ReactNode } from "react";

type Tone = "light" | "dark";

/** The heading that opens a full-bleed band. `text-display`, like a page title
    — a marketing band is the same kind of thing as a page. */
export function BandHeading({
  as: Tag = "h2",
  children,
  className = "",
  tone = "light",
}: {
  as?: "h1" | "h2";
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <Tag
      className={`font-display text-display font-bold tracking-[.02em] uppercase ${
        tone === "dark" ? "text-cream-50" : "text-ink-900"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

/** The one introductory paragraph under a band heading. */
export function BandIntro({
  children,
  className = "",
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <p
      className={`text-lead ${tone === "dark" ? "text-cream-200" : "text-ink-800"} ${className}`}
    >
      {children}
    </p>
  );
}

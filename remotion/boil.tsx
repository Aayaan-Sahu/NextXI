import React from "react";
import { useCurrentFrame } from "remotion";

/**
 * Line-boil via SVG turbulent displacement.
 *
 * The classic hand-drawn "boil" is the same drawing re-traced a few times and
 * cycled at a low frame rate. We fake that by displacing the rendered pixels
 * with fractal noise and re-seeding the noise on a stepped clock — held for
 * BOIL_HOLD frames so the wobble reads as ~7.5fps flipbook jitter, not as
 * smooth electrical noise.
 *
 * Usage: render <BoilFilters /> once per scene tree, then put
 * `style={{ ...boil.a }}` (or boil.b / boil.strong) on any element.
 * Two seed-offset filters exist so neighbouring elements don't wobble in sync.
 */

const BOIL_HOLD = 4; // frames each displacement is held → 7.5fps at 30fps

export const BoilFilters: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / BOIL_HOLD);

  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <filter id="boil-a" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012"
            numOctaves={2}
            seed={seed}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={7}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <filter id="boil-b" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.014"
            numOctaves={2}
            seed={seed + 57}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={7}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <filter id="boil-strong" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01"
            numOctaves={2}
            seed={seed + 113}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={12}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
};

export const boil = {
  a: { filter: "url(#boil-a)" } as React.CSSProperties,
  b: { filter: "url(#boil-b)" } as React.CSSProperties,
  strong: { filter: "url(#boil-strong)" } as React.CSSProperties,
};

"use client";

import type { LandingCopy } from "@/components/landing/copy";
import { GuideButton } from "@/components/landing/guide-button";
import { BandHeading } from "@/components/landing/landing-ui";
import { Kicker } from "@/components/ui";
import {
  ConnectAnimation,
  NeuralNetAnimation,
  StepArrow,
  UploadAnimation,
} from "@/components/landing/step-animations";

// The words live in `copy.ts` (per language); this is only the order and the
// animation each step gets.
const STEPS = [
  { guide: true, animation: <UploadAnimation /> },
  { guide: false, animation: <NeuralNetAnimation /> },
  { guide: false, animation: <ConnectAnimation /> },
];

export function FeaturesSteps({ copy }: { copy: LandingCopy["steps"] }) {
  return (
    <section className="bg-seam-stitch px-6 py-24 sm:px-12">
      <div className="mx-auto w-full max-w-[1000px]">
        <header className="mb-16 text-center">
          <Kicker tone="dark">{copy.kicker}</Kicker>
          <BandHeading tone="dark" className="mt-3">
            {copy.heading}
          </BandHeading>
        </header>

        {STEPS.map((step, i) => (
          <div key={i}>
            {i > 0 && <StepArrow flip={i % 2 === 0} />}
            <article className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
              <div className={i % 2 === 1 ? "md:order-2" : ""}>{step.animation}</div>
              <div className={i % 2 === 1 ? "md:order-1 md:text-right" : ""}>
                <Kicker tone="dark">{copy.items[i].kicker}</Kicker>
                <h3 className="mt-2 font-display text-title font-bold text-cream-50 uppercase">
                  {copy.items[i].title}
                </h3>
                <p className="mt-3 text-body text-cream-200">{copy.items[i].body}</p>
                {step.guide && <GuideButton label={copy.guide} />}
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}

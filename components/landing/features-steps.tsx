"use client";

import { GuideButton } from "@/components/landing/guide-button";
import { Kicker } from "@/components/ui";
import {
  ConnectAnimation,
  NeuralNetAnimation,
  StepArrow,
  UploadAnimation,
} from "@/components/landing/step-animations";

const STEPS = [
  {
    kicker: "01 · Upload",
    title: "Players upload videos",
    body: "Film a clip from the nets. Watch the short guide so the report can actually see your action.",
    guide: true,
    animation: <UploadAnimation />,
  },
  {
    kicker: "02 · Analyze",
    title: "AI builds your coaching report",
    body: "Our AI tracks your head, bat and feet through every ball, and turns the movement into real measurements — stride, head travel, swing path — in a report you can read on the bus home.",
    guide: false,
    animation: <NeuralNetAnimation />,
  },
  {
    kicker: "03 · Connect",
    title: "Coaches & scouts find you",
    body: "Verified coaches and scouts watch your videos, read our AI report, and reach out. No talent goes undiscovered.",
    guide: false,
    animation: <ConnectAnimation />,
  },
];

export function FeaturesSteps() {
  return (
    <section className="bg-seam-stitch px-6 py-24 sm:px-12">
      <div className="mx-auto w-full max-w-[1000px]">
        <header className="mb-16 text-center">
          <Kicker tone="dark">How it works</Kicker>
          <h2 className="mt-3 font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] text-cream-50 uppercase sm:text-5xl">
            From the nets to the scout&apos;s desk
          </h2>
        </header>

        {STEPS.map((step, i) => (
          <div key={step.kicker}>
            {i > 0 && <StepArrow flip={i % 2 === 0} />}
            <article className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
              <div className={i % 2 === 1 ? "md:order-2" : ""}>{step.animation}</div>
              <div className={i % 2 === 1 ? "md:order-1 md:text-right" : ""}>
                <Kicker tone="dark">{step.kicker}</Kicker>
                <h3 className="mt-2 font-display text-2xl leading-tight font-bold text-cream-50 uppercase sm:text-3xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-cream-200">
                  {step.body}
                </p>
                {step.guide && <GuideButton />}
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { RecordingGuideModal } from "@/components/recording-guide";
import { Kicker } from "@/components/ui";
import {
  ConnectAnimation,
  NeuralNetAnimation,
  StepArrow,
  UploadAnimation,
} from "@/components/landing/step-animations";

/** Opens the same recording-guide video players see inside the app. */
function RecordingGuideCta() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md border border-cream-200/30 px-4 py-2 text-[13px] font-semibold text-cream-50 hover:border-gold-500 hover:text-gold-500"
        onClick={() => setOpen(true)}
        type="button"
      >
        How to record your videos →
      </button>
      {open ? <RecordingGuideModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

const STEPS: Array<{
  kicker: string;
  title: string;
  body: string;
  animation: ReactNode;
  extra?: ReactNode;
}> = [
  {
    kicker: "01 · Upload",
    title: "Players upload videos",
    body: "No training session goes wasted. Please find our guide for how to record your videos here:",
    extra: <RecordingGuideCta />,
    animation: <UploadAnimation />,
  },
  {
    kicker: "02 · Analyze",
    title: "AI builds your coaching report",
    body: "Our AI model extrapolates key metrics for both batting and bowling, turning them into a report you can read on the bus home.",
    animation: <NeuralNetAnimation />,
  },
  {
    kicker: "03 · Connect",
    title: "Coaches & scouts find you",
    body: "Verified coaches and scouts watch your videos, read our AI report, and reach out. No talent goes undiscovered.",
    animation: <ConnectAnimation />,
  },
];

export function FeaturesSteps() {
  return (
    <section className="bg-seam-stitch px-6 py-24 sm:px-12">
      <div className="mx-auto w-full max-w-[1000px]">
        <motion.header
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
          className="mb-16 text-center"
        >
          <Kicker tone="dark">How it works</Kicker>
          <h2 className="mt-3 font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] text-cream-50 uppercase sm:text-5xl">
            From the nets to the scout&apos;s desk
          </h2>
        </motion.header>

        {STEPS.map((step, i) => (
          <div key={step.kicker}>
            {i > 0 && <StepArrow flip={i % 2 === 0} />}
            <motion.article
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6 }}
              className="grid items-center gap-8 md:grid-cols-2 md:gap-16"
            >
              <div className={i % 2 === 1 ? "md:order-2" : ""}>{step.animation}</div>
              <div className={i % 2 === 1 ? "md:order-1 md:text-right" : ""}>
                <Kicker tone="dark">{step.kicker}</Kicker>
                <h3 className="mt-2 font-display text-2xl leading-tight font-bold text-cream-50 uppercase sm:text-3xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-cream-200">
                  {step.body}
                </p>
                {step.extra}
              </div>
            </motion.article>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { motion } from "motion/react";
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
    title: "Players upload technique videos",
    body: "Record a spell from the side-on camera guide and upload it straight from your phone. Resumable uploads mean a flaky net-session connection never loses a delivery.",
    animation: <UploadAnimation />,
  },
  {
    kicker: "02 · Analyze",
    title: "AI builds your coaching report",
    body: "Pose tracking measures stride, arm path, release and front-leg brace on every ball (the same overlays you just scrolled through) and turns them into a report you can read on the bus home.",
    animation: <NeuralNetAnimation />,
  },
  {
    kicker: "03 · Connect",
    title: "Coaches & scouts find you",
    body: "Verified coaches browse player profiles, watch the reports, and reach out. A good spell in the nets counts even when nobody important was there to see it.",
    animation: <ConnectAnimation />,
  },
];

export function FeaturesSteps() {
  return (
    <section className="bg-cream-200 px-6 py-24 sm:px-12">
      <div className="mx-auto w-full max-w-[1000px]">
        <motion.header
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
          className="mb-16 text-center"
        >
          <Kicker>How it works</Kicker>
          <h2 className="mt-3 font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] uppercase sm:text-5xl">
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
                <Kicker>{step.kicker}</Kicker>
                <h3 className="mt-2 font-display text-2xl leading-tight font-bold uppercase sm:text-3xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
                  {step.body}
                </p>
              </div>
            </motion.article>
          </div>
        ))}
      </div>
    </section>
  );
}

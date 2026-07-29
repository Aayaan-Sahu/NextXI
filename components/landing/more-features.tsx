"use client";

import { motion } from "motion/react";
import { Kicker } from "@/components/ui";

// The end-to-end journey, in order: a session becomes a report, a report earns
// a connection, a connection opens a conversation. Rendered as a sequence so
// the "end-to-end" claim reads visually, not just as four loose cards.
const STEPS = [
  {
    step: "01",
    title: "Sessions",
    body: "Track sessions, goals, and match stats across the season.",
  },
  {
    step: "02",
    title: "AI report",
    body: "Every upload becomes a numbers-first coaching report — real measurements, not scores. When the footage doesn't show enough to measure honestly, the report says so. Coaches you connect with watch the video itself and leave their own feedback.",
  },
  {
    step: "03",
    title: "Coach connections",
    body: "Coaches send connection requests to promising players and build their roster. Players can also request to connect with coaches.",
  },
  {
    step: "04",
    title: "Messaging",
    body: "Conversations and feedback between coaches and players leads to the development of the NextXI.",
  },
];

export function MoreFeatures() {
  return (
    <section className="bg-cream-100 px-6 py-24 sm:px-12">
      <div className="mx-auto w-full max-w-[1200px]">
        <motion.header
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
          className="mb-14 text-center"
        >
          <Kicker>One platform</Kicker>
          <h2 className="mt-3 font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] uppercase sm:text-5xl">
            End-to-end provider
          </h2>
        </motion.header>

        <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center">
          {STEPS.map((step, i) => (
            <div key={step.step} className="contents">
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex-1 rounded-[10px] border border-cream-400 bg-white p-6"
              >
                <span className="font-mono text-[11px] font-semibold tracking-[.2em] text-rust-600">
                  {step.step}
                </span>
                <h3 className="mt-2 font-display text-lg leading-tight font-semibold uppercase">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{step.body}</p>
              </motion.div>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="self-center font-mono text-2xl text-rust-600/50 max-lg:rotate-90"
                >
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

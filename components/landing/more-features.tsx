"use client";

import { motion } from "motion/react";
import { Kicker } from "@/components/ui";

const FEATURES = [
  {
    title: "Messaging",
    body: "Message your coach on the platform. Guardians can read along.",
  },
  {
    title: "Coach connections",
    body: "Coaches send connection requests to promising players and build their roster.",
  },
  {
    title: "Video feedback",
    body: "Coaches comment on the exact moment in a video, down to the second.",
  },
  {
    title: "Sessions",
    body: "Track sessions, goals, and match stats across the season.",
  },
];

export function MoreFeatures() {
  return (
    <section className="bg-cream-100 px-6 py-24 sm:px-12">
      <div className="mx-auto w-full max-w-[1100px]">
        <motion.header
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55 }}
          className="mb-14 text-center"
        >
          <Kicker>And many more</Kicker>
          <h2 className="mt-3 font-display text-[32px] leading-[1.05] font-bold tracking-[.02em] uppercase sm:text-5xl">
            Everything around the game
          </h2>
        </motion.header>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-[10px] border border-cream-400 bg-white p-6"
            >
              <h3 className="font-display text-lg leading-tight font-semibold uppercase">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {feature.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

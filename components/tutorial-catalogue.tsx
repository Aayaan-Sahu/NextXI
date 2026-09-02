"use client";

import Image from "next/image";
import { useState } from "react";
import { VideoModal } from "@/components/video-modal";
import { SectionHeading } from "@/components/ui";
import { type Tutorial, tutorialPoster, tutorialSrc } from "@/lib/tutorials";

/**
 * The list on /tutorials. Each film gets its heading, one line of prose and its
 * own poster — no card, no grid: this is a reading page, and the posters are
 * the only pictures on it.
 */
export function TutorialCatalogue({ tutorials }: { tutorials: Tutorial[] }) {
  const [playing, setPlaying] = useState<Tutorial | null>(null);

  return (
    <>
      {tutorials.map((tutorial) => (
        <section key={tutorial.id}>
          <SectionHeading>{tutorial.title}</SectionHeading>
          <p className="mt-1 text-caption text-ink-600">
            For {tutorial.audience} · {tutorial.length}
          </p>
          <button
            aria-label={`Play ${tutorial.title}`}
            className="group relative mt-3.5 block w-full cursor-pointer overflow-hidden rounded-[10px] border border-cream-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            onClick={() => setPlaying(tutorial)}
            type="button"
          >
            <Image
              alt=""
              className="block h-auto w-full"
              height={720}
              priority={tutorial.id === "player"}
              src={tutorialPoster(tutorial.id)}
              width={1280}
            />
            <span className="absolute inset-0 grid place-items-center bg-pitch-950/25 transition-colors group-hover:bg-pitch-950/10">
              <span className="rounded-md bg-gold-500 px-4 py-2.5 text-ui font-semibold text-ink-900">
                <span aria-hidden>▶</span> Play
              </span>
            </span>
          </button>
          <p className="mt-3.5 text-body text-pretty text-ink-800">{tutorial.blurb}</p>
        </section>
      ))}
      {playing ? (
        <VideoModal
          onClose={() => setPlaying(null)}
          poster={tutorialPoster(playing.id)}
          src={tutorialSrc(playing.id)}
          title={playing.title}
        />
      ) : null}
    </>
  );
}

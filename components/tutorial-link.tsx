"use client";

import { useState } from "react";
import { VideoModal } from "@/components/video-modal";
import { type Tutorial, tutorialPoster, tutorialSrc } from "@/lib/tutorials";

/**
 * The quiet way into a tutorial from a dashboard home: a link, not a card and
 * not a banner. Somebody who already knows how the page works should be able
 * to ignore it without effort.
 */
export function TutorialLink({ tutorial }: { tutorial: Tutorial }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="cursor-pointer text-ui font-semibold text-rust-600 underline-offset-2 hover:text-rust-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        onClick={() => setOpen(true)}
        type="button"
      >
        Watch the {tutorial.length} tour
      </button>
      {open ? (
        <VideoModal
          onClose={() => setOpen(false)}
          poster={tutorialPoster(tutorial.id)}
          src={tutorialSrc(tutorial.id)}
          title={tutorial.title}
        />
      ) : null}
    </>
  );
}

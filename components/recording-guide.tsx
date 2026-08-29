"use client";

import { useState } from "react";
import { VideoModal } from "@/components/video-modal";

/** Circled "?" that opens the standardized-recording tutorial video in a modal. */
export function RecordingGuideButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="How to record your video"
        className="grid size-[18px] shrink-0 cursor-pointer place-items-center rounded-full border border-cream-500 text-micro font-semibold text-ink-600 hover:border-ink-900 hover:text-ink-900"
        onClick={() => setOpen(true)}
        title="How to record your video"
        type="button"
      >
        ?
      </button>
      {open ? (
        <VideoModal
          onClose={() => setOpen(false)}
          src="/recording-guide.mp4"
          title="How to record your video"
        />
      ) : null}
    </>
  );
}

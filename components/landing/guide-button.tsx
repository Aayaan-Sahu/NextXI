"use client";

import { useState } from "react";
import { VideoModal } from "@/components/video-modal";

/**
 * Labelled button that opens the standardized recording-guide video in a modal.
 * Same asset the dashboard upload flow uses (recording-guide.mp4), surfaced on
 * the landing page under the Upload step.
 */
export function GuideButton({ label }: { label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md bg-gold-500 px-4 py-2.5 text-ui font-semibold text-ink-900 hover:bg-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span aria-hidden>▶</span> {label}
      </button>
      {open ? (
        <VideoModal onClose={() => setOpen(false)} src="/recording-guide.mp4" title={label} />
      ) : null}
    </>
  );
}

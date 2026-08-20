"use client";

import { useEffect, useState } from "react";

/** Circled "?" that opens the standardized-recording tutorial video in a modal. */
export function RecordingGuideButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

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
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-900/60 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
        >
          {/* muted: the guide has no audio track, and browsers only autoplay muted video */}
          <video
            autoPlay
            className="w-full max-w-[960px] rounded-[10px] bg-olive-950 shadow-float"
            controls
            muted
            onClick={(event) => event.stopPropagation()}
            playsInline
            src="/recording-guide.mp4"
          />
        </div>
      ) : null}
    </>
  );
}

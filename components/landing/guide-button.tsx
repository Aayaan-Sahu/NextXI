"use client";

import { useEffect, useState } from "react";

/**
 * Labelled button that opens the standardized recording-guide video in a modal.
 * Same asset the dashboard upload flow uses (recording-guide.mp4), surfaced on
 * the landing page under the Upload step.
 */
export function GuideButton() {
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
        className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md bg-gold-500 px-4 py-2.5 text-ui font-semibold text-ink-900 hover:bg-gold-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span aria-hidden>▶</span> Watch the recording guide
      </button>
      {open ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-950/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
        >
          {/* muted: the guide has no audio track, and browsers only autoplay muted video */}
          <video
            autoPlay
            className="w-full max-w-[960px] rounded-[10px] border border-cream-400 bg-olive-950 shadow-float"
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

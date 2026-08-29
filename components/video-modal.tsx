"use client";

import { useEffect, useRef } from "react";

/**
 * The one full-screen video overlay in the product: the recording guide, the
 * landing page's copy of it, and the tutorials all open through here. It was
 * two near-identical components before the tutorials arrived, and a third copy
 * is how a pattern stops being one.
 *
 * The video carries no audio track — every film in the product is captioned —
 * so `muted` costs nothing and is what lets a browser autoplay it at all.
 */
export function VideoModal({
  onClose,
  poster,
  src,
  title,
}: {
  onClose: () => void;
  poster?: string;
  src: string;
  /** Names the dialog for screen readers. */
  title: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      aria-label={title}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-950/70 p-4"
      onClick={onClose}
      role="dialog"
    >
      <div className="w-full max-w-[1040px]" onClick={(event) => event.stopPropagation()}>
        <div className="mb-2.5 flex items-center justify-between gap-4">
          <p className="text-ui font-semibold text-cream-100">{title}</p>
          <button
            className="cursor-pointer text-ui font-semibold text-cream-200/70 hover:text-cream-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            Close
          </button>
        </div>
        <video
          autoPlay
          className="w-full rounded-[10px] border border-cream-400 bg-olive-950 shadow-float"
          controls
          muted
          playsInline
          poster={poster}
          src={src}
        />
      </div>
    </div>
  );
}

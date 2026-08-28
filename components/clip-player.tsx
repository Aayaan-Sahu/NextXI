"use client";

import { useEffect, useRef } from "react";
import { SeekButton } from "@/components/seek-button";
import { useVideoTime, useVideoTimeStore } from "@/components/video-time";
import { formatTimestamp } from "@/lib/format-time";
import type { Moment } from "@/lib/report-moments";

const RATES = [
  { rate: 1, word: "1×" },
  { rate: 0.5, word: "½×" },
  { rate: 0.25, word: "¼×" },
] as const;

const WORD_BUTTON = "cursor-pointer rounded-sm py-1.5 text-ui pointer-coarse:min-h-11";
const WORD_IDLE = "text-ink-800 hover:text-ink-900";
const WORD_ACTIVE = "font-semibold text-ink-900 shadow-[inset_0_-2px_0_var(--color-amber-500)]";

/**
 * The clip with everything a review needs that native controls lack, as
 * words beneath the well (the system has no icon vocabulary): the report's
 * moments to jump to, ½× and ¼× playback, frame-stepping when the report
 * knows the frame rate, and a readout that shows tenths while paused so a
 * frame step visibly moves. Native controls stay for the scrubber, keyboard,
 * captions and picture-in-picture. Inside a VideoTimeProvider the same clock
 * drives every timestamp on the page; without one it is just the video.
 */
export function ClipPlayer({
  src,
  poster,
  fps = null,
  moments = [],
  initialTime,
  className = "",
}: {
  src: string;
  poster?: string;
  /** From the report; frame-stepping is hidden when unknown. */
  fps?: number | null;
  moments?: Moment[];
  /** A deep link (`?t=`): applied once metadata arrives, paused. */
  initialTime?: number;
  className?: string;
}) {
  const store = useVideoTimeStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const appliedInitial = useRef(false);
  const { time, duration, paused, rate } = useVideoTime();

  useEffect(() => {
    if (!store) return;
    store.attach(videoRef.current);
    return () => store.attach(null);
  }, [store]);

  useEffect(() => {
    if (!store || initialTime === undefined || duration === null || appliedInitial.current) return;
    appliedInitial.current = true;
    store.seek(initialTime);
  }, [store, initialTime, duration]);

  return (
    <div className={className}>
      <video
        className="aspect-video w-full rounded-lg bg-olive-950"
        controls
        playsInline
        poster={poster}
        preload="metadata"
        ref={videoRef}
        src={src}
      />
      {store ? (
        <>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-1">
            {moments.length ? (
              <ul aria-label="Moments" className="flex flex-wrap items-center gap-x-4">
                {moments.map((moment) => (
                  <li key={`${moment.label}-${moment.t}`}>
                    <SeekButton label={moment.label} size="ui" t={moment.t} />
                  </li>
                ))}
              </ul>
            ) : (
              <span />
            )}
            <span className="py-1.5 text-caption text-ink-600 tabular-nums">
              {formatTimestamp(time, { tenths: paused })}
              {duration !== null ? ` / ${formatTimestamp(duration)}` : ""}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1">
            <div aria-label="Playback speed" className="flex items-center gap-x-3" role="group">
              {RATES.map(({ rate: value, word }) => (
                <button
                  aria-pressed={rate === value}
                  className={`${WORD_BUTTON} ${rate === value ? WORD_ACTIVE : WORD_IDLE}`}
                  key={value}
                  onClick={() => store.setRate(value)}
                  type="button"
                >
                  {word}
                </button>
              ))}
            </div>
            {fps ? (
              <div className="flex items-center gap-x-3">
                <button
                  aria-label="Previous frame"
                  className={`${WORD_BUTTON} ${WORD_IDLE}`}
                  onClick={() => store.step(-1, fps)}
                  type="button"
                >
                  ‹ Frame
                </button>
                <button
                  aria-label="Next frame"
                  className={`${WORD_BUTTON} ${WORD_IDLE}`}
                  onClick={() => store.step(1, fps)}
                  type="button"
                >
                  Frame ›
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

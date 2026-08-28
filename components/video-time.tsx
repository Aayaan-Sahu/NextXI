"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * The clip's clock, shared between the player and everything that wants to
 * jump it: the moments rail, timestamps in the report rows, timestamped
 * comments, and the composer's "Pin to 0:04" field. Server components render
 * the tiny client leaves (SeekButton, TimestampField) and this provider wraps
 * the page section that holds the video — no page round-trip per click, and
 * nothing re-renders at 60 Hz: the store publishes only on media events.
 */

export type VideoTimeSnapshot = {
  time: number;
  duration: number | null;
  paused: boolean;
  rate: number;
};

export type VideoTimeStore = {
  subscribe(listener: () => void): () => void;
  get(): VideoTimeSnapshot;
  attach(video: HTMLVideoElement | null): void;
  /** Jump to `t` seconds; pauses first unless told not to. */
  seek(t: number, options?: { pause?: boolean }): void;
  /** Move by whole frames at the clip's frame rate (pauses). */
  step(frames: number, fps: number): void;
  setRate(rate: number): void;
};

/** Two clip positions this close are the same moment. */
export const MOMENT_WINDOW_SEC = 0.5;

const SERVER_SNAPSHOT: VideoTimeSnapshot = { time: 0, duration: null, paused: true, rate: 1 };
const SEEK_STALL_MS = 250;
const PUBLISH_EVENTS = ["timeupdate", "play", "pause", "durationchange", "ratechange", "ended"] as const;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createVideoTimeStore(): VideoTimeStore {
  let video: HTMLVideoElement | null = null;
  let snapshot = SERVER_SNAPSHOT;
  const listeners = new Set<() => void>();
  let pendingTime: number | null = null;
  let seekIssuedAt = 0;
  let stallTimer: ReturnType<typeof setTimeout> | null = null;

  const publish = () => {
    snapshot = video
      ? {
          time: video.currentTime,
          duration: Number.isFinite(video.duration) ? video.duration : null,
          paused: video.paused,
          rate: video.playbackRate,
        }
      : SERVER_SNAPSHOT;
    for (const listener of listeners) listener();
  };

  // One seek in flight at a time (the landing scrubber learned this the hard
  // way): setting currentTime while the previous seek is still decoding
  // aborts it. Hold the latest target and issue it on `seeked`, or after a
  // short stall should a seek hang on the network.
  const flushSeek = () => {
    if (!video || pendingTime === null || !Number.isFinite(video.duration)) return;
    if (video.seeking && performance.now() - seekIssuedAt < SEEK_STALL_MS) return;
    const target = Math.min(Math.max(0, pendingTime), video.duration);
    pendingTime = null;
    if (Math.abs(target - video.currentTime) > 1 / 120) {
      seekIssuedAt = performance.now();
      video.currentTime = target;
    } else {
      publish();
    }
  };

  const onSeeked = () => {
    publish();
    flushSeek();
  };

  const detach = () => {
    if (!video) return;
    for (const event of PUBLISH_EVENTS) video.removeEventListener(event, publish);
    video.removeEventListener("seeked", onSeeked);
    video.removeEventListener("loadedmetadata", onSeeked);
    video = null;
  };

  const seek: VideoTimeStore["seek"] = (t, { pause = true } = {}) => {
    if (!video) return;
    if (pause) video.pause();
    pendingTime = t;
    flushSeek();
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(flushSeek, SEEK_STALL_MS);
    video.scrollIntoView?.({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get: () => snapshot,
    attach(next) {
      detach();
      video = next;
      if (video) {
        for (const event of PUBLISH_EVENTS) video.addEventListener(event, publish);
        video.addEventListener("seeked", onSeeked);
        video.addEventListener("loadedmetadata", onSeeked);
      }
      publish();
    },
    seek,
    step(frames, fps) {
      if (!video || !(fps > 0)) return;
      seek(video.currentTime + frames / fps);
    },
    setRate(rate) {
      if (video) video.playbackRate = rate;
    },
  };
}

const VideoTimeContext = createContext<VideoTimeStore | null>(null);

export function VideoTimeProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createVideoTimeStore);
  return <VideoTimeContext.Provider value={store}>{children}</VideoTimeContext.Provider>;
}

const noopSubscribe = () => () => {};
const getServerSnapshot = () => SERVER_SNAPSHOT;

/** The store, or null when no player is mounted on this page. */
export function useVideoTimeStore(): VideoTimeStore | null {
  return useContext(VideoTimeContext);
}

/** The clock; re-renders on media events only (a few times a second at most). */
export function useVideoTime(): VideoTimeSnapshot {
  const store = useContext(VideoTimeContext);
  return useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    store ? store.get : getServerSnapshot,
    getServerSnapshot,
  );
}

/** Whether the clip sits at `t` — a boolean snapshot, so it re-renders only on a flip. */
export function useIsAtTime(t: number | null): boolean {
  const store = useContext(VideoTimeContext);
  return useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    () => store !== null && t !== null && Math.abs(store.get().time - t) <= MOMENT_WINDOW_SEC,
    () => false,
  );
}

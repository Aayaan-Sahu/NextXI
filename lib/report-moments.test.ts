import { describe, expect, test } from "bun:test";
import { deriveMoments, deriveVideoFps } from "@/lib/report-moments";

const batting = {
  video: { fps: 30 },
  shots: [
    { frames: { swing_peak: 82 }, swing: { swing_label: "good" } },
    { frames: {} },
    { frames: { swing_peak: 400 } },
  ],
};

const bowling = {
  video: { fps: 240 },
  delivery: {
    events: {
      back_foot_landing_time_sec: 2.0,
      front_foot_landing_time_sec: 2.4,
      release_time_sec: 2.6,
    },
  },
};

describe("deriveVideoFps", () => {
  test("reads a positive frame rate, else null", () => {
    expect(deriveVideoFps(batting)).toBe(30);
    expect(deriveVideoFps({ video: { fps: 0 } })).toBeNull();
    expect(deriveVideoFps({})).toBeNull();
    expect(deriveVideoFps(null)).toBeNull();
  });
});

describe("deriveMoments", () => {
  test("numbers batting shots by payload position and converts frames to seconds", () => {
    expect(deriveMoments(batting)).toEqual([
      { label: "Shot 1", t: 82 / 30 },
      { label: "Shot 3", t: 400 / 30 },
    ]);
  });

  test("needs a frame rate to place shots", () => {
    expect(deriveMoments({ shots: batting.shots })).toEqual([]);
  });

  test("labels the three delivery events in clip order", () => {
    expect(deriveMoments(bowling).map((m) => m.label)).toEqual([
      "Back-foot landing",
      "Front-foot landing",
      "Release",
    ]);
  });

  test("reads legacy timeline notes, clipping long ones", () => {
    const note = "Front elbow drops early here, which opens the bat face at contact.";
    const moments = deriveMoments({ annotations: [{ timestamp_s: 4.2, note }] });
    expect(moments).toHaveLength(1);
    expect(moments[0].t).toBe(4.2);
    expect(moments[0].label.length).toBeLessThanOrEqual(40);
    expect(moments[0].label.endsWith("…")).toBe(true);
  });

  test("sorts, drops invalid times and collapses duplicates", () => {
    const moments = deriveMoments({
      annotations: [
        { timestamp_s: 5, note: "later" },
        { timestamp_s: -1, note: "negative" },
        { timestamp_s: 1, note: "first" },
        { timestamp_s: 1.001, note: "same frame" },
      ],
    });
    expect(moments.map((m) => m.label)).toEqual(["first", "later"]);
  });

  test("a v3 payload without shots has no moments", () => {
    expect(deriveMoments({ measurements: [{ key: "stride", value: 1 }], video: { fps: 30 } })).toEqual([]);
  });
});

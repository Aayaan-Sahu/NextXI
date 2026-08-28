import { describe, expect, test } from "bun:test";
import { formatTimestamp, relativeTime } from "@/lib/format-time";

describe("formatTimestamp", () => {
  test("floors to whole seconds by default", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(2.73)).toBe("0:02");
    expect(formatTimestamp(13.33)).toBe("0:13");
    expect(formatTimestamp(65.9)).toBe("1:05");
  });

  test("shows tenths on request", () => {
    expect(formatTimestamp(2.73, { tenths: true })).toBe("0:02.7");
    expect(formatTimestamp(60, { tenths: true })).toBe("1:00.0");
  });

  test("never goes negative or NaN", () => {
    expect(formatTimestamp(-4)).toBe("0:00");
    expect(formatTimestamp(Number.NaN)).toBe("0:00");
  });
});

describe("relativeTime", () => {
  const now = Date.UTC(2026, 7, 27, 12, 0, 0);

  test("picks the largest whole unit", () => {
    expect(relativeTime(new Date(now - 30 * 1000), now)).toBe("just now");
    expect(relativeTime(new Date(now - 5 * 60 * 1000), now)).toBe("5 minutes ago");
    expect(relativeTime(new Date(now - 3 * 60 * 60 * 1000), now)).toBe("3 hours ago");
    expect(relativeTime(new Date(now - 2 * 24 * 60 * 60 * 1000), now)).toBe("2 days ago");
  });
});

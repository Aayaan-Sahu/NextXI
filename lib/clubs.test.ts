import { describe, expect, test } from "bun:test";
import { clubNameMatches, isValidClubName, normalizeClubName } from "@/lib/clubs";

describe("normalizeClubName", () => {
  test("ignores case and collapses whitespace", () => {
    expect(normalizeClubName("  Riverside   CC ")).toBe("riverside cc");
  });
});

describe("clubNameMatches", () => {
  test("matches the same name typed carelessly", () => {
    expect(clubNameMatches("Riverside CC", "riverside  cc")).toBe(true);
    expect(clubNameMatches("Riverside CC", "RIVERSIDE CC")).toBe(true);
  });

  test("does not match a different club", () => {
    // A near-match would connect a club to a child who never named it.
    expect(clubNameMatches("Riverside CC", "Riverside Cricket Club")).toBe(false);
    expect(clubNameMatches("Riverside CC", "Riverside")).toBe(false);
    expect(clubNameMatches("Riverside CC", "Riverdale CC")).toBe(false);
  });

  test("empty never matches, so a blank club field claims nobody", () => {
    expect(clubNameMatches("", "")).toBe(false);
    expect(clubNameMatches("   ", "Riverside CC")).toBe(false);
  });
});

describe("isValidClubName", () => {
  test("rejects what the CHECK constraint would", () => {
    expect(isValidClubName("A")).toBe(false);
    expect(isValidClubName("CC")).toBe(true);
    expect(isValidClubName("x".repeat(121))).toBe(false);
  });
});

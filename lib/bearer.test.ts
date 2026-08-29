import { describe, expect, test } from "bun:test";
import { parseBearer, resolveAuthorization } from "@/lib/bearer";

describe("parseBearer", () => {
  test("reads the token, case-insensitively, tolerating stray whitespace", () => {
    expect(parseBearer("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(parseBearer("bearer abc")).toBe("abc");
    expect(parseBearer("  Bearer   abc  ")).toBe("abc");
  });

  test("anything else is no bearer", () => {
    expect(parseBearer(null)).toBeUndefined();
    expect(parseBearer(undefined)).toBeUndefined();
    expect(parseBearer("")).toBeUndefined();
    expect(parseBearer("Basic abc")).toBeUndefined();
    expect(parseBearer("Bearer")).toBeUndefined();
    expect(parseBearer("Bearer a b")).toBeUndefined();
  });
});

describe("resolveAuthorization", () => {
  test("a missing header uses the cookie session", () => {
    expect(resolveAuthorization(null)).toEqual({ source: "cookie" });
    expect(resolveAuthorization(undefined)).toEqual({ source: "cookie" });
  });

  test("a parseable Bearer uses that token", () => {
    expect(resolveAuthorization("Bearer abc.def.ghi")).toEqual({
      source: "bearer",
      token: "abc.def.ghi",
    });
  });

  test("a present but unparseable header is signed out, not a cookie fallback", () => {
    expect(resolveAuthorization("")).toEqual({ source: "none" });
    expect(resolveAuthorization("Basic abc")).toEqual({ source: "none" });
    expect(resolveAuthorization("Bearer")).toEqual({ source: "none" });
    expect(resolveAuthorization("Bearer a b")).toEqual({ source: "none" });
  });
});

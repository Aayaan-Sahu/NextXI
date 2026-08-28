import { describe, expect, test } from "bun:test";
import { parseBearer } from "@/lib/bearer";

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

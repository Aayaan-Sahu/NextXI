import { describe, expect, test } from "bun:test";
import { demoEmail, demoPersonEmail, isDemoEmail } from "@/scripts/demo-world";

describe("isDemoEmail", () => {
  test("recognises both forms the demo world creates", () => {
    expect(isDemoEmail(demoEmail("maya"))).toBe(true);
    expect(isDemoEmail(demoPersonEmail("maya.ellison"))).toBe(true);
    expect(isDemoEmail("NEXTXI-DEMO-Maya@Example.com")).toBe(true);
  });

  test("never matches an address that could belong to a real person", () => {
    // The teardown deletes everything this returns true for, so the domain
    // check is the whole safety property: example.com cannot receive mail.
    expect(isDemoEmail("maya.ellison.demo@gmail.com")).toBe(false);
    expect(isDemoEmail("nextxi-demo-maya@gmail.com")).toBe(false);
    expect(isDemoEmail("someone@example.com")).toBe(false);
    expect(isDemoEmail("demo@example.com")).toBe(false);
    expect(isDemoEmail(null)).toBe(false);
    expect(isDemoEmail("")).toBe(false);
  });
});

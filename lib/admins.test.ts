import { describe, expect, test } from "bun:test";
import { isAdminIdentity, parseAdminEmails } from "@/lib/admins";

describe("parseAdminEmails", () => {
  test("splits, trims and lowercases", () => {
    expect([...parseAdminEmails(" One@Example.com , two@example.com ")]).toEqual([
      "one@example.com",
      "two@example.com",
    ]);
  });

  test("is empty when unset", () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
    expect(parseAdminEmails("").size).toBe(0);
    expect(parseAdminEmails(" , ,").size).toBe(0);
  });
});

describe("isAdminIdentity", () => {
  const emails = parseAdminEmails("listed@example.com");

  test("matches the environment list regardless of case", () => {
    expect(isAdminIdentity({ email: "Listed@Example.com" }, emails)).toBe(true);
    expect(isAdminIdentity({ email: "someone@example.com" }, emails)).toBe(false);
  });

  test("accepts the flag from the token, whichever shape carries it", () => {
    expect(isAdminIdentity({ admin: true, email: "someone@example.com" }, emails)).toBe(true);
    expect(
      isAdminIdentity({ app_metadata: { admin: true }, email: "someone@example.com" }, emails),
    ).toBe(true);
  });

  test("only a real true grants it", () => {
    for (const admin of [false, "true", 1, "", null, undefined]) {
      expect(isAdminIdentity({ app_metadata: { admin }, email: "someone@example.com" }, emails)).toBe(
        false,
      );
    }
  });

  test("nobody is an admin by default", () => {
    expect(isAdminIdentity(null, emails)).toBe(false);
    expect(isAdminIdentity(undefined, emails)).toBe(false);
    expect(isAdminIdentity({}, emails)).toBe(false);
    expect(isAdminIdentity({ email: "listed@example.com" }, parseAdminEmails(""))).toBe(false);
  });
});

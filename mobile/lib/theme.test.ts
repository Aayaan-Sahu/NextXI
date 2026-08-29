import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateTheme, readThemeCss } from "@/scripts/theme-codegen";
import { colors, fonts, typeRoles } from "@/lib/theme";

/**
 * lib/theme.ts is generated from shared/theme.css, the file the web styles
 * from. This is the guard that keeps the two in step: add a colour on the
 * web without running `bun run tokens` and this fails, instead of the app
 * quietly missing it.
 */

const committed = readFileSync(join(import.meta.dir, "theme.ts"), "utf8");

describe("lib/theme.ts", () => {
  test("is what shared/theme.css generates — run `bun run tokens`", () => {
    expect(committed).toBe(generateTheme(readThemeCss()));
  });

  test("carries the colours the design system is built on", () => {
    // A spot-check on the tokens with jobs, so a regression in the parser
    // itself cannot pass by generating an empty-but-matching file.
    expect(colors["rust-600"]).toBe("#8a2116");
    expect(colors["amber-500"]).toBe("#e8a92e");
    expect(colors["gold-500"]).toBe("#f2c79b");
    expect(colors["cream-200"]).toBe("#f3ebdd");
    expect(colors["cream-400"]).toBe("#e0d6c3");
    expect(colors["pitch-900"]).toBe("#241c15");
    expect(colors["moss-600"]).toBe("#2f6b3e");
  });

  test("has exactly the nine type roles, line heights resolved to pixels", () => {
    expect(Object.keys(typeRoles).sort()).toEqual(
      ["body", "caption", "display", "figure", "figure-sm", "lead", "micro", "title", "ui"].sort(),
    );
    // 15px at the CSS's 1.6 ratio.
    expect(typeRoles.body).toEqual({ fontSize: 15, lineHeight: 24 });
    expect(typeRoles.display.fontSize).toBe(30);
    for (const [role, { fontSize, lineHeight }] of Object.entries(typeRoles)) {
      expect({ role, ok: fontSize > 0 && lineHeight >= fontSize }).toEqual({ role, ok: true });
    }
  });

  test("names a font family for every weight the app renders", () => {
    expect(Object.values(fonts).every((name) => name.length > 0)).toBe(true);
  });
});

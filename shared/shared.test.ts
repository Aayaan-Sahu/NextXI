import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * shared/ is imported by both the Next.js app and the React Native app, which
 * have almost no runtime in common. This test is the guardrail described in
 * shared/README.md: a module here may import nothing but its siblings.
 *
 * It fails loudly on the mistake that would otherwise be found only when a
 * Metro build blows up — pulling in `next/*`, a Node built-in, the Prisma
 * client, or `process.env` (the two runtimes inline different variables).
 */

const DIR = import.meta.dir;

const files = readdirSync(DIR).filter(
  (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
);

/** Every module specifier in an import/export-from, plus dynamic import(). */
function specifiers(source: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /(?:^|\n)\s*import\s[^;]*?from\s*["']([^"']+)["']/g,
    /(?:^|\n)\s*import\s*["']([^"']+)["']/g,
    /(?:^|\n)\s*export\s[^;]*?from\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.add(match[1]);
  }
  return [...found];
}

test("shared/ has modules to guard", () => {
  expect(files.length).toBeGreaterThan(0);
});

describe.each(files)("shared/%s", (name) => {
  const source = readFileSync(join(DIR, name), "utf8");

  test("imports only its siblings in shared/", () => {
    for (const specifier of specifiers(source)) {
      // A relative specifier that stays in this directory is the only
      // allowed shape: "./videos", not "../lib/prisma".
      expect({ name, specifier }).toEqual({
        name,
        specifier: expect.stringMatching(/^\.\/[^/]+$/),
      });
    }
  });

  test("reads no environment variables", () => {
    expect(source).not.toMatch(/process\s*\.\s*env/);
  });
});

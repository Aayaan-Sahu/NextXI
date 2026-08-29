import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { getTutorial, TUTORIALS, tutorialPoster, tutorialSrc } from "@/lib/tutorials";

const publicPath = (webPath: string) =>
  path.join(import.meta.dir, "..", "public", webPath.replace(/^\//, ""));

describe("tutorials", () => {
  test("every listed tutorial has its film and poster committed", () => {
    // The catalogue is the only thing pointing at these files; a rename or a
    // render that never got copied across would otherwise surface as a broken
    // page rather than a failing test.
    for (const tutorial of TUTORIALS) {
      expect(existsSync(publicPath(tutorialSrc(tutorial.id)))).toBe(true);
      expect(existsSync(publicPath(tutorialPoster(tutorial.id)))).toBe(true);
    }
  });

  test("getTutorial resolves the ids the dashboards ask for", () => {
    // The player and coach homes look these up by literal id.
    expect(getTutorial("player")?.audience).toBe("players");
    expect(getTutorial("coach")?.audience).toBe("coaches and scouts");
  });

  test("ids are unique", () => {
    expect(new Set(TUTORIALS.map((tutorial) => tutorial.id)).size).toBe(TUTORIALS.length);
  });
});

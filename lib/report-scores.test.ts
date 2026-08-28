import { describe, expect, test } from "bun:test";
import {
  BANDED_SCORE,
  GOOD_FROM,
  OK_FROM,
  THRESHOLDS,
  bandFor,
  deriveScores,
  occasionScores,
  scoreHigherIsBetter,
  scoreLowerIsBetter,
  verdictFor,
} from "@/lib/report-scores";

/**
 * The worker's own three-way judgement (cricket_analysis/common.py
 * `score_label`), so the tests can assert the one rule that matters: a score
 * band never disagrees with the label.
 */
function workerLabel(value: number, good: number, ok: number, lowerIsBetter = true) {
  if (lowerIsBetter) {
    if (value < good) return "good";
    if (value < ok) return "ok";
    return "needs work";
  }
  if (value > good) return "good";
  if (value > ok) return "ok";
  return "needs work";
}

describe("scoreLowerIsBetter", () => {
  const { good, ok } = THRESHOLDS.head_movement;

  test("anchors: zero deviation is 100, the thresholds are the band edges", () => {
    expect(scoreLowerIsBetter(0, good, ok)).toBe(100);
    expect(scoreLowerIsBetter(good, good, ok)).toBe(GOOD_FROM);
    expect(scoreLowerIsBetter(ok, good, ok)).toBe(OK_FROM);
    expect(scoreLowerIsBetter(2 * ok, good, ok)).toBe(OK_FROM / 2);
  });

  test("is monotone and never reaches zero", () => {
    let last = 101;
    for (let x = 0; x <= 2; x += 0.005) {
      const score = scoreLowerIsBetter(x, good, ok);
      expect(score).toBeLessThanOrEqual(last);
      expect(score).toBeGreaterThan(0);
      last = score;
    }
  });

  test("band agrees with the worker's label everywhere", () => {
    for (const [g, o] of [
      [THRESHOLDS.head_movement.good, THRESHOLDS.head_movement.ok],
      [THRESHOLDS.bat_swing.good, THRESHOLDS.bat_swing.ok],
      [THRESHOLDS.balance.good, THRESHOLDS.balance.ok],
    ]) {
      for (let x = 0.001; x < 1.5; x += 0.0031) {
        expect(bandFor(scoreLowerIsBetter(x, g, o))).toBe(workerLabel(x, g, o));
      }
    }
  });
});

describe("scoreHigherIsBetter", () => {
  const { good, ok, best } = THRESHOLDS.knee_landing_deg;

  test("anchors", () => {
    expect(scoreHigherIsBetter(best, good, ok, best)).toBe(100);
    expect(scoreHigherIsBetter(good, good, ok, best)).toBe(GOOD_FROM);
    expect(scoreHigherIsBetter(ok, good, ok, best)).toBe(OK_FROM);
    expect(scoreHigherIsBetter(0, good, ok, best)).toBe(0);
  });

  test("band agrees with the worker's label", () => {
    for (let angle = 90; angle <= 180; angle += 0.7) {
      expect(bandFor(scoreHigherIsBetter(angle, good, ok, best))).toBe(
        workerLabel(angle, good, ok, false),
      );
    }
  });
});

describe("verdicts", () => {
  test("session verdict thresholds match the landing page", () => {
    expect(verdictFor(85)).toBe("great");
    expect(verdictFor(84)).toBe("good");
    expect(verdictFor(70)).toBe("good");
    expect(verdictFor(69)).toBe("solid");
    expect(verdictFor(60)).toBe("solid");
    expect(verdictFor(59)).toBe("keep");
  });

  test("banded fallbacks sit in the middle of their band", () => {
    expect(bandFor(BANDED_SCORE.good)).toBe("good");
    expect(bandFor(BANDED_SCORE.ok)).toBe("ok");
    expect(bandFor(BANDED_SCORE["needs work"])).toBe("needs work");
  });
});

/** A v2 batting shot in the worker's shape (cricket_analysis/batting.py _shot_payload). */
function shot(over: {
  head?: number;
  headCm?: number;
  swing?: number;
  swingCm?: number;
  balance?: number;
  balanceLabel?: "good" | "ok" | "needs work";
  inside?: boolean;
}) {
  const head = over.head ?? 0.1;
  const swing = over.swing ?? 0.08;
  return {
    frames: { swing_peak: 82 },
    head: {
      max_head_movement_norm: head,
      ...(over.headCm !== undefined ? { max_head_movement_cm: over.headCm } : {}),
      head_movement_label: workerLabel(head, 0.15, 0.3),
    },
    swing: {
      swing_straightness_mean: swing,
      ...(over.swingCm !== undefined ? { swing_deviation_cm: over.swingCm } : {}),
      swing_label: workerLabel(swing, 0.1, 0.2),
    },
    balance: {
      head_inside_base: over.inside ?? true,
      hip_inside_base: over.inside ?? true,
      ...(over.balance !== undefined ? { worst_base_offset_norm: over.balance } : {}),
      balance_label:
        over.balanceLabel ?? (over.balance !== undefined ? workerLabel(over.balance, 0.25, 0.4) : "good"),
    },
  };
}

const battingPayload = (shots: unknown[]) => ({
  video: { fps: 30 },
  coverage: { scored: true },
  shots,
  consistency: {},
});

describe("deriveScores — batting", () => {
  test("three tiles from a calibrated clip, notes carry the facts", () => {
    const payload = battingPayload([
      shot({ head: 0.05, headCm: 3.1, swing: 0.05, swingCm: 2.6, balance: 0.1 }),
      shot({ head: 0.07, headCm: 4.4, swing: 0.06, swingCm: 3.0, balance: 0.12 }),
      shot({ head: 0.06, headCm: 3.8, swing: 0.07, swingCm: 3.5, balance: 0.11 }),
    ]);
    const scores = deriveScores(payload, [], new Date("2026-08-24"));
    expect(scores).not.toBeNull();
    expect(scores!.tiles.map((tile) => tile.key)).toEqual(["head_movement", "bat_swing", "balance"]);
    const [head, swing, balance] = scores!.tiles;
    // Medians: head 0.06 → 100 − 30·(0.06/0.15) = 88; swing 0.06 → 82; balance 0.11 → 86.8 → 87.
    expect(head.score).toBe(88);
    expect(swing.score).toBe(82);
    expect(balance.score).toBe(87);
    expect(scores!.score).toBe(Math.round((88 + 82 + 87) / 3));
    expect(scores!.verdict).toBe("great");
    expect(head.note).toBe("Good. Head moved 4 cm at most on a typical ball.");
    expect(swing.note).toBe("Good. Bat came down 3 cm off straight on a typical ball.");
    expect(balance.note).toBe("Good. Head and hips over the base at contact on 3 of 3 balls.");
    expect(head.delta).toBeNull();
    expect(scores!.previousScore).toBeNull();
    expect(scores!.history).toEqual([{ date: new Date("2026-08-24"), score: scores!.score }]);
    expect(scores!.tiles.every((tile) => !tile.banded)).toBe(true);
  });

  test("older payloads without balance offsets fall back to the label band", () => {
    const payload = battingPayload([
      shot({ balanceLabel: "needs work", inside: false }),
      shot({ balanceLabel: "needs work", inside: false }),
      shot({ balanceLabel: "good" }),
    ]);
    const balance = deriveScores(payload, [], new Date())!.tiles.find((t) => t.key === "balance")!;
    expect(balance.banded).toBe(true);
    expect(balance.score).toBe(BANDED_SCORE["needs work"]);
    expect(balance.note).toBe("Needs work. Head and hips over the base at contact on 1 of 3 balls.");
  });

  test("the demo clip: a big forward head movement reads needs work, as its label does", () => {
    // hero-drive.mp4 through the worker: one shot, head 0.617 stance widths
    // (41 cm), swing 0.079, balance label only.
    const payload = battingPayload([
      {
        head: { max_head_movement_cm: 41.2, max_head_movement_norm: 0.6167, head_movement_label: "needs work" },
        swing: { swing_straightness_mean: 0.0789, swing_label: "good" },
        balance: { head_inside_base: false, hip_inside_base: true, balance_label: "needs work" },
      },
    ]);
    const scores = deriveScores(payload, [], new Date())!;
    const [head, swing, balance] = scores.tiles;
    expect(head.band).toBe("needs work");
    expect(head.score).toBe(29);
    expect(head.note).toBe("Needs work. Head moved 41 cm at most.");
    expect(swing.score).toBe(76);
    expect(swing.note).toBe("Good. Bat path measured, but this clip didn't calibrate to centimetres.");
    expect(balance.score).toBe(30);
    expect(scores.score).toBe(45);
    expect(scores.verdict).toBe("keep");
  });

  test("deltas and history come from previous occasions, oldest first", () => {
    const today = battingPayload([shot({ head: 0.06, swing: 0.06, balance: 0.11 })]);
    const history = [
      { date: new Date("2026-07-01"), scores: { overall: 68, tiles: { head_movement: 80, bat_swing: 60, balance: 64 } } },
      { date: new Date("2026-07-08"), scores: { overall: 71, tiles: { head_movement: 82, bat_swing: 61 } } },
      { date: new Date("2026-07-15"), scores: { overall: 74, tiles: { head_movement: 84, bat_swing: 66, balance: 72 } } },
      { date: new Date("2026-07-22"), scores: { overall: 79, tiles: { head_movement: 86, bat_swing: 70, balance: 81 } } },
      { date: new Date("2026-07-29"), scores: { overall: 76, tiles: { head_movement: 84, bat_swing: 66, balance: 78 } } },
      { date: new Date("2026-08-05"), scores: { overall: 80, tiles: { head_movement: 85, bat_swing: 76, balance: 79 } } },
    ];
    const scores = deriveScores(today, history, new Date("2026-08-12"))!;
    expect(scores.previousScore).toBe(80);
    expect(scores.tiles.map((tile) => tile.delta)).toEqual([88 - 85, 82 - 76, 87 - 79]);
    expect(scores.history.map((point) => point.score)).toEqual([71, 74, 79, 76, 80, scores.score]);
    expect(scores.history[0].date).toEqual(new Date("2026-07-08"));
  });

  test("declines honestly: no shots, scored false, v1 and v3 payloads", () => {
    expect(deriveScores(battingPayload([]), [], new Date())).toBeNull();
    expect(deriveScores({ overall_score: 78, metrics: [] }, [], new Date())).toBeNull();
    expect(deriveScores({ measurements: [], shots: [shot({})] }, [], new Date())).toBeNull();
  });
});

describe("deriveScores — bowling", () => {
  const delivery = (landing: number, release: number, label?: string) => ({
    video: { fps: 30 },
    coverage: { scored: true },
    delivery: {
      front_knee_brace: {
        landing_angle_deg: landing,
        release_angle_deg: release,
        angle_change_deg: release - landing,
        brace_label: label ?? "braced",
      },
      stride: { length_cm: 140 },
    },
  });

  test("the brace is the weaker of landing angle and give", () => {
    // Lands straight (168° → 70 + 30·13/25 = 85.6) but gives 12° (60 + 10·(15−12)/10 = 63) → 63, "ok".
    const scores = deriveScores(delivery(168, 156, "soft/absorbing"), [], new Date())!;
    expect(scores.tiles).toHaveLength(1);
    expect(scores.tiles[0].score).toBe(63);
    expect(scores.tiles[0].band).toBe("ok");
    expect(scores.tiles[0].note).toBe("Okay. Front knee 168° at landing, 12° of give by release.");
    expect(scores.score).toBe(63);
  });

  test("a collapsing knee scores below 60 either way", () => {
    expect(deriveScores(delivery(130, 128, "collapsing"), [], new Date())!.score).toBeLessThan(60);
    expect(deriveScores(delivery(170, 150, "collapsing"), [], new Date())!.score).toBeLessThan(60);
  });

  test("occasions pool deliveries by median", () => {
    const pooled = occasionScores("bowling", [delivery(160, 158), delivery(150, 140), delivery(170, 168)]);
    // Median landing 160 → 76, median give 2 → 100 − 30·(2/5) = 88 → min 76.
    expect(pooled).toEqual({ overall: 76, tiles: { front_knee_brace: 76 } });
  });
});

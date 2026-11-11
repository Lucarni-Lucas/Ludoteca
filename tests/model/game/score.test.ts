import { describe, expect, it } from "vitest";

import { ScoreOutOfRangeError } from "@/model/game/errors";
import { formatScore, normalizeScore, SCORE_STEP, scoreLabel, stepScore } from "@/model/game/score";

describe("normalizeScore", () => {
  it("Más de un decimal", () => {
    const written = 9.35;

    const score = normalizeScore(written);

    expect(score).toBeCloseTo(9.4, 10);
  });

  it.each([0, 10, 7.5])("acepta %s", (value) => {
    const written = value;

    const score = normalizeScore(written);

    expect(score).toBe(value);
  });

  it.each([-0.1, 10.04, 11, Number.NaN])("rechaza %s con ScoreOutOfRangeError", (value) => {
    const written = value;

    const normalize = () => normalizeScore(written);

    expect(normalize).toThrow(ScoreOutOfRangeError);
  });
});

describe("scoreLabel", () => {
  it("Excelente", () => {
    const score = 9.8;

    const label = scoreLabel(score);

    expect(label).toBe("Excelente");
  });

  it("Obra maestra", () => {
    const score = 10;

    const label = scoreLabel(score);

    expect(label).toBe("Obra maestra");
  });

  it.each([
    { score: 0, expected: "Horrible" },
    { score: 1.9, expected: "Horrible" },
    { score: 2, expected: "Muy malo" },
    { score: 2.9, expected: "Muy malo" },
    { score: 3, expected: "Malo" },
    { score: 3.9, expected: "Malo" },
    { score: 4, expected: "Flojo" },
    { score: 4.9, expected: "Flojo" },
    { score: 5, expected: "Regular" },
    { score: 5.9, expected: "Regular" },
    { score: 6, expected: "Pasable" },
    { score: 6.9, expected: "Pasable" },
    { score: 7, expected: "Bueno" },
    { score: 7.9, expected: "Bueno" },
    { score: 8, expected: "Muy bueno" },
    { score: 8.9, expected: "Muy bueno" },
    { score: 9, expected: "Excelente" },
    { score: 9.9, expected: "Excelente" },
  ])("$score es «$expected»", ({ score, expected }) => {
    const value = score;

    const label = scoreLabel(value);

    expect(label).toBe(expected);
  });
});

describe("stepScore", () => {
  it.each([
    { score: 7, delta: SCORE_STEP, expected: 7.1 },
    { score: 0.3, delta: -SCORE_STEP, expected: 0.2 },
    { score: 10, delta: SCORE_STEP, expected: 10 },
    { score: 0, delta: -SCORE_STEP, expected: 0 },
  ])("$score con $delta da $expected", ({ score, delta, expected }) => {
    const current = score;

    const next = stepScore(current, delta);

    expect(next).toBe(expected);
  });
});

describe("formatScore", () => {
  it("siempre muestra un decimal", () => {
    const score = 8;

    const text = formatScore(score);

    expect(text).toBe("8.0");
  });
});

import { describe, expect, it } from "vitest";

import { ReleaseYearOutOfRangeError } from "@/model/game/errors";
import { releaseYearRange, validateReleaseYear } from "@/model/game/release-year";

const TODAY_2026 = "2026-11-11";

describe("releaseYearRange", () => {
  it("va de 1950 al año siguiente al de hoy", () => {
    const today = TODAY_2026;

    const range = releaseYearRange(today);

    expect(range).toEqual({ min: 1950, max: 2027 });
  });
});

describe("validateReleaseYear", () => {
  it("Año negativo", () => {
    const year = -2017;

    const validate = () => validateReleaseYear(year, TODAY_2026);

    expect(validate).toThrow(ReleaseYearOutOfRangeError);
    expect(validate).toThrow("Poné un año entre 1950 y 2027");
  });

  it("Año que viene", () => {
    const year = 2027;

    const valid = validateReleaseYear(year, TODAY_2026);

    expect(valid).toBe(2027);
  });

  it("Sin año", () => {
    const year = null;

    const valid = validateReleaseYear(year, TODAY_2026);

    expect(valid).toBeNull();
  });

  it.each([1949, 2028, 2025.5])("rechaza %s", (year) => {
    const value = year;

    const validate = () => validateReleaseYear(value, TODAY_2026);

    expect(validate).toThrow(ReleaseYearOutOfRangeError);
  });

  it("acepta 1950, el primer año", () => {
    const year = 1950;

    const valid = validateReleaseYear(year, TODAY_2026);

    expect(valid).toBe(1950);
  });
});

import { describe, expect, it } from "vitest";

import { createClock } from "@/shared/clock";

describe("createClock", () => {
  it.each([
    {
      description: "a las 23:30, cuando en UTC ya es el día siguiente",
      instant: "2026-11-07T02:30:00Z",
      expected: "2026-11-06",
    },
    {
      description: "a las 00:30, cuando en UTC son las 03:30 del mismo día",
      instant: "2026-11-06T03:30:00Z",
      expected: "2026-11-06",
    },
    {
      description: "a las 23:59 del último día del año, cuando en UTC ya es el año siguiente",
      instant: "2027-01-01T02:59:00Z",
      expected: "2026-12-31",
    },
  ])("devuelve el día argentino $description", ({ instant, expected }) => {
    const clock = createClock(() => new Date(instant));

    const today = clock.today();

    expect(today).toBe(expected);
  });
});

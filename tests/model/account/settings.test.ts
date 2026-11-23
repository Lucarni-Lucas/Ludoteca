import { describe, expect, it } from "vitest";

import { localeChange } from "@/model/account/settings";

describe("localeChange", () => {
  it.each([
    { name: "elegir otro idioma lo actualiza", current: "es", chosen: "en", expected: "updated" },
    { name: "elegir el idioma que ya se veía no cambia nada", current: "en", chosen: "en", expected: "unchanged" },
  ] as const)("$name", ({ current, chosen, expected }) => {
    const shown = current;

    const change = localeChange(shown, chosen);

    expect(change).toBe(expected);
  });
});

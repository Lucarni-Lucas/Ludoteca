import { describe, expect, it } from "vitest";

import { DEFAULT_SIGNED_IN_PATH, safeNextPath } from "@/model/account/next-path";

describe("safeNextPath", () => {
  it("conserva una ruta relativa con su búsqueda y su ancla", () => {
    const next = "/games/123?tab=diario#notas";

    const result = safeNextPath(next);

    expect(result).toBe(next);
  });

  it.each([
    ["vacío", ""],
    ["null", null],
    ["undefined", undefined],
  ])("usa la Biblioteca cuando next es %s", (_case, next) => {
    const value = next;

    const result = safeNextPath(value);

    expect(result).toBe(DEFAULT_SIGNED_IN_PATH);
  });

  it.each([
    "//sitio.com",
    "https://sitio.com/library",
    "/\\sitio.com",
    "/\t/sitio.com",
    "/\n/sitio.com",
    "javascript:alert(1)",
    "library",
  ])("rechaza %j, que puede sacarte del sitio", (next) => {
    const value = next;

    const result = safeNextPath(value);

    expect(result).toBe(DEFAULT_SIGNED_IN_PATH);
  });
});

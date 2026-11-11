import { describe, expect, it } from "vitest";

import { isSettingsPath, sectionForPath } from "@/components/layout/sections";

describe("sectionForPath", () => {
  it.each([
    ["/library", "library"],
    ["/check", "check"],
    ["/subscriptions", "subscriptions"],
    ["/stores", "stores"],
    ["/library/filtros", "library"],
  ])("reconoce %s como la sección %s", (pathname, expected) => {
    const path = pathname;

    const section = sectionForPath(path);

    expect(section).toBe(expected);
  });

  it.each(["/add", "/settings/account", "/libraryx"])("no marca ninguna sección en %s", (pathname) => {
    const path = pathname;

    const section = sectionForPath(path);

    expect(section).toBeNull();
  });
});

describe("sectionForPath en la ficha", () => {
  it("marca Biblioteca en la ficha de un juego", () => {
    const path = "/games/00000000-0000-4000-8000-000000000001";

    const section = sectionForPath(path);

    expect(section).toBe("library");
  });

  it("no confunde una ruta que solo empieza igual", () => {
    const path = "/gamesx";

    const section = sectionForPath(path);

    expect(section).toBeNull();
  });
});

describe("isSettingsPath", () => {
  it.each([
    ["/settings", true],
    ["/settings/account", true],
    ["/settingsx", false],
    ["/library", false],
  ])("en %s devuelve %s", (pathname, expected) => {
    const path = pathname;

    const result = isSettingsPath(path);

    expect(result).toBe(expected);
  });
});

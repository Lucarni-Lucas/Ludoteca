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

import { describe, expect, it } from "vitest";

import { resolveAccess } from "@/security/resolve-access";

describe("resolveAccess", () => {
  it("manda a la pantalla de ingreso, recordando la ruta, cuando no hay sesión", () => {
    const request = { pathname: "/games/123", search: "?tab=diario", hasSession: false };

    const decision = resolveAccess(request);

    expect(decision).toEqual({
      action: "redirect",
      location: "/login?next=%2Fgames%2F123%3Ftab%3Ddiario",
    });
  });

  it("deja pasar a cualquier pantalla con sesión", () => {
    const request = { pathname: "/stores", search: "", hasSession: true };

    const decision = resolveAccess(request);

    expect(decision).toEqual({ action: "allow" });
  });

  it("muestra la pantalla de ingreso a quien no tiene sesión", () => {
    const request = { pathname: "/login", search: "?next=%2Fstores", hasSession: false };

    const decision = resolveAccess(request);

    expect(decision).toEqual({ action: "allow" });
  });

  it("manda a la Biblioteca a quien entra a la pantalla de ingreso con sesión", () => {
    const request = { pathname: "/login", search: "", hasSession: true };

    const decision = resolveAccess(request);

    expect(decision).toEqual({ action: "redirect", location: "/library" });
  });

  it.each([true, false])("deja libre /auth/callback con sesión en %s", (hasSession) => {
    const request = { pathname: "/auth/callback", search: "?code=abc", hasSession };

    const decision = resolveAccess(request);

    expect(decision).toEqual({ action: "allow" });
  });

  it("no libera una ruta que solo empieza como la del callback", () => {
    const request = { pathname: "/auth/callback-falso", search: "", hasSession: false };

    const decision = resolveAccess(request);

    expect(decision).toMatchObject({ action: "redirect" });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveAuthCallback } from "@/app/auth/callback/resolve-auth-callback";
import { EMAIL_NOT_ALLOWED_MESSAGE, EmailNotAllowedError, SignInFailedError } from "@/model/account/errors";
import { logger } from "@/shared/logger";

function dependencies() {
  return {
    exchangeCode: vi.fn().mockResolvedValue("lucas@example.com"),
    ensureEmailAllowed: vi.fn().mockResolvedValue(undefined),
    rejectSession: vi.fn().mockResolvedValue(undefined),
  };
}

function params(values: Record<string, string>): URLSearchParams {
  return new URLSearchParams(values);
}

describe("resolveAuthCallback", () => {
  beforeEach(() => {
    vi.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("canjea el código, verifica el mail y sigue a la pantalla pedida", async () => {
    const deps = dependencies();

    const location = await resolveAuthCallback(params({ code: "abc", next: "/games/1" }), deps);

    expect(location).toBe("/games/1");
    expect(deps.exchangeCode).toHaveBeenCalledWith("abc");
    expect(deps.ensureEmailAllowed).toHaveBeenCalledWith("lucas@example.com");
    expect(deps.rejectSession).not.toHaveBeenCalled();
  });

  it("sigue a la Biblioteca cuando no hay pantalla pedida", async () => {
    const deps = dependencies();

    const location = await resolveAuthCallback(params({ code: "abc" }), deps);

    expect(location).toBe("/library");
  });

  it("no sigue a un sitio externo", async () => {
    const deps = dependencies();

    const location = await resolveAuthCallback(params({ code: "abc", next: "//sitio.com" }), deps);

    expect(location).toBe("/library");
  });

  it("informa el fallo cuando falta el código", async () => {
    const deps = dependencies();

    const location = await resolveAuthCallback(params({}), deps);

    expect(location).toBe("/login?error=sign_in_failed");
    expect(deps.exchangeCode).not.toHaveBeenCalled();
  });

  it("informa el fallo cuando el código está vacío", async () => {
    const deps = dependencies();

    const location = await resolveAuthCallback(params({ code: "   " }), deps);

    expect(location).toBe("/login?error=sign_in_failed");
  });

  it("cierra la sesión e informa el rechazo cuando el mail no está permitido", async () => {
    const deps = dependencies();
    deps.ensureEmailAllowed.mockRejectedValue(new EmailNotAllowedError());

    const location = await resolveAuthCallback(params({ code: "abc" }), deps);

    expect(location).toBe("/login?error=not_allowed");
    expect(deps.rejectSession).toHaveBeenCalledOnce();
  });

  it("no deja la sesión abierta si no pudo verificar el mail", async () => {
    const deps = dependencies();
    deps.ensureEmailAllowed.mockRejectedValue(new Error("sin conexión"));

    const location = await resolveAuthCallback(params({ code: "abc" }), deps);

    expect(location).toBe("/login?error=sign_in_failed");
    expect(deps.rejectSession).toHaveBeenCalledOnce();
  });

  it("informa el fallo cuando el canje del código falla", async () => {
    const deps = dependencies();
    deps.exchangeCode.mockRejectedValue(new SignInFailedError());

    const location = await resolveAuthCallback(params({ code: "abc" }), deps);

    expect(location).toBe("/login?error=sign_in_failed");
    expect(deps.ensureEmailAllowed).not.toHaveBeenCalled();
  });

  it("informa el fallo cuando el proveedor devuelve un error", async () => {
    const deps = dependencies();

    const location = await resolveAuthCallback(params({ error: "access_denied", error_description: "denied" }), deps);

    expect(location).toBe("/login?error=sign_in_failed");
    expect(deps.exchangeCode).not.toHaveBeenCalled();
  });

  it("reconoce el rechazo del hook en la descripción del error", async () => {
    const deps = dependencies();

    const location = await resolveAuthCallback(
      params({ error: "server_error", error_description: EMAIL_NOT_ALLOWED_MESSAGE }),
      deps,
    );

    expect(location).toBe("/login?error=not_allowed");
  });
});

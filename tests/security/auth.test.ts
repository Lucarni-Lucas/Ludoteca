import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SignInFailedError, SignOutFailedError } from "@/model/account/errors";
import {
  discardRejectedSession,
  endSession,
  exchangeCodeForEmail,
  requestGoogleSignInUrl,
} from "@/security/auth";
import { logger } from "@/shared/logger";

const origin = "https://ludoteca.example.com";

describe("funciones de ingreso y cierre", () => {
  beforeEach(() => {
    vi.spyOn(logger, "error").mockImplementation(() => undefined);
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("requestGoogleSignInUrl", () => {
    it("pide el ingreso con Google y vuelve al callback conservando la pantalla pedida", async () => {
      const signInWithOAuth = vi.fn().mockResolvedValue({ data: { url: "https://google.test/x" }, error: null });

      const url = await requestGoogleSignInUrl({ signInWithOAuth }, { origin, next: "/games/1" });

      expect(url).toBe("https://google.test/x");
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: `${origin}/auth/callback?next=%2Fgames%2F1` },
      });
    });

    it("descarta un next externo antes de armar la vuelta", async () => {
      const signInWithOAuth = vi.fn().mockResolvedValue({ data: { url: "https://google.test/x" }, error: null });

      await requestGoogleSignInUrl({ signInWithOAuth }, { origin, next: "https://sitio.com" });

      expect(signInWithOAuth.mock.calls[0]?.[0].options.redirectTo).toBe(`${origin}/auth/callback?next=%2Flibrary`);
    });

    it("lanza un error con nombre cuando el proveedor falla", async () => {
      const signInWithOAuth = vi.fn().mockResolvedValue({ data: { url: null }, error: new Error("caído") });

      const call = requestGoogleSignInUrl({ signInWithOAuth }, { origin });

      await expect(call).rejects.toBeInstanceOf(SignInFailedError);
    });
  });

  describe("exchangeCodeForEmail", () => {
    it("devuelve el mail de la cuenta que ingresó", async () => {
      const exchangeCodeForSession = vi.fn().mockResolvedValue({
        data: { user: { email: "lucas@example.com" } },
        error: null,
      });

      const email = await exchangeCodeForEmail({ exchangeCodeForSession }, "codigo");

      expect(email).toBe("lucas@example.com");
      expect(exchangeCodeForSession).toHaveBeenCalledWith("codigo");
    });

    it("lanza un error con nombre cuando el canje falla", async () => {
      const exchangeCodeForSession = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("vencido") });

      const call = exchangeCodeForEmail({ exchangeCodeForSession }, "codigo");

      await expect(call).rejects.toBeInstanceOf(SignInFailedError);
    });

    it("lanza un error con nombre cuando la cuenta no trae mail", async () => {
      const exchangeCodeForSession = vi.fn().mockResolvedValue({ data: { user: {} }, error: null });

      const call = exchangeCodeForEmail({ exchangeCodeForSession }, "codigo");

      await expect(call).rejects.toBeInstanceOf(SignInFailedError);
    });
  });

  describe("endSession", () => {
    it("cierra solo la sesión de este dispositivo", async () => {
      const signOut = vi.fn().mockResolvedValue({ error: null });

      await endSession({ signOut });

      expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    });

    it("lanza un error con nombre cuando no se pudo cerrar", async () => {
      const signOut = vi.fn().mockResolvedValue({ error: new Error("caído") });

      const call = endSession({ signOut });

      await expect(call).rejects.toBeInstanceOf(SignOutFailedError);
    });
  });

  describe("discardRejectedSession", () => {
    function cookieJarWith(...names: string[]) {
      return { getAll: () => names.map((name) => ({ name })), delete: vi.fn() };
    }

    it("no toca las cookies cuando el cierre funciona", async () => {
      const signOut = vi.fn().mockResolvedValue({ error: null });
      const cookieJar = cookieJarWith("sb-abc-auth-token");

      await discardRejectedSession({ signOut }, cookieJar);

      expect(cookieJar.delete).not.toHaveBeenCalled();
    });

    it("borra las cookies de sesión cuando el cierre falla, y solo esas", async () => {
      const signOut = vi.fn().mockResolvedValue({ error: new Error("caído") });
      const cookieJar = cookieJarWith("sb-abc-auth-token.0", "sb-abc-auth-token.1", "preferencia");

      await discardRejectedSession({ signOut }, cookieJar);

      expect(cookieJar.delete.mock.calls.map(([name]) => name)).toEqual([
        "sb-abc-auth-token.0",
        "sb-abc-auth-token.1",
      ]);
    });
  });
});

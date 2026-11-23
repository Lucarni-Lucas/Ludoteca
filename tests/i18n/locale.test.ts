import { afterEach, describe, expect, it, vi } from "vitest";

import { readRequestLocale, type RequestLocaleSources } from "@/i18n/locale";
import type { Locale } from "@/model/account/locale";
import { DatabaseUnavailableError } from "@/shared/app-error";
import { logger } from "@/shared/logger";

const USER = { id: "usuario-1", email: "lucas@example.com", name: "Lucas" };
const SPANISH_BROWSER = "es-AR,es;q=0.9";
const ENGLISH_BROWSER = "en-US,en;q=0.9";

function sources(overrides: Partial<RequestLocaleSources> & { browser?: string }): RequestLocaleSources {
  return {
    sessionUser: async () => USER,
    chosenLocale: async (): Promise<Locale | null> => null,
    acceptLanguage: async () => overrides.browser ?? SPANISH_BROWSER,
    ...overrides,
  };
}

describe("readRequestLocale", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sin sesión vale el idioma del navegador", async () => {
    const chosenLocale = vi.fn(async (): Promise<Locale | null> => "es");
    const request = sources({ sessionUser: async () => null, chosenLocale, browser: ENGLISH_BROWSER });

    const locale = await readRequestLocale(request);

    expect(locale).toBe("en");
    expect(chosenLocale).not.toHaveBeenCalled();
  });

  it("Navegador en inglés", async () => {
    const request = sources({ browser: ENGLISH_BROWSER });

    const locale = await readRequestLocale(request);

    expect(locale).toBe("en");
  });

  it("Otro dispositivo", async () => {
    const request = sources({ chosenLocale: async () => "en", browser: SPANISH_BROWSER });

    const locale = await readRequestLocale(request);

    expect(locale).toBe("en");
  });

  it("cae en el idioma del navegador y lo anota cuando la base no responde", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const unavailable = new Error("Failed query", { cause: new DatabaseUnavailableError() });
    const request = sources({ chosenLocale: () => Promise.reject(unavailable), browser: SPANISH_BROWSER });

    const locale = await readRequestLocale(request);

    expect(locale).toBe("es");
    expect(warn).toHaveBeenCalledWith(expect.any(String), { error: unavailable });
  });

  it("deja pasar cualquier otro error", async () => {
    const failure = new Error("se rompió otra cosa");
    const request = sources({ chosenLocale: () => Promise.reject(failure) });

    const read = readRequestLocale(request);

    await expect(read).rejects.toBe(failure);
  });
});

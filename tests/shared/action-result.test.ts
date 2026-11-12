import { afterEach, describe, expect, it, vi } from "vitest";

import {
  INTERNAL_ERROR_CODE,
  INTERNAL_ERROR_MESSAGE,
  toActionResult,
} from "@/shared/action-result";
import { AppError, DatabaseUnavailableError, InvalidRequestError } from "@/shared/app-error";
import { logger } from "@/shared/logger";

class GameCaseError extends AppError {
  readonly code = "GAME_CASE";

  constructor() {
    super("Ese juego no existe.");
  }
}

describe("toActionResult", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve ok con el dato cuando la acción termina bien", async () => {
    const action = () => Promise.resolve({ id: 7 });

    const result = await toActionResult(action);

    expect(result).toEqual({ ok: true, data: { id: 7 } });
  });

  it("acepta una acción que no es asíncrona", async () => {
    const action = () => "listo";

    const result = await toActionResult(action);

    expect(result).toEqual({ ok: true, data: "listo" });
  });

  it("traduce un error con nombre a su código y su mensaje en español", async () => {
    const action = () => Promise.reject(new GameCaseError());

    const result = await toActionResult(action);

    expect(result).toEqual({
      ok: false,
      error: { code: "GAME_CASE", message: "Ese juego no existe." },
    });
  });

  it("usa el mensaje por defecto de un error de pedido inválido", async () => {
    const action = () => Promise.reject(new InvalidRequestError());

    const result = await toActionResult(action);

    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "El pedido no es válido." },
    });
  });

  it("no filtra el mensaje interno de un error desconocido", async () => {
    const log = vi.spyOn(logger, "error").mockImplementation(() => undefined);
    const internal = new Error("connection to db.interno refused");

    const result = await toActionResult(() => Promise.reject(internal));

    expect(result).toEqual({
      ok: false,
      error: { code: INTERNAL_ERROR_CODE, message: INTERNAL_ERROR_MESSAGE },
    });
    expect(JSON.stringify(result)).not.toContain("db.interno");
    expect(log).toHaveBeenCalledWith(expect.any(String), { error: internal });
  });

  it("trata como error desconocido algo lanzado que no es un Error", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => undefined);

    const result = await toActionResult(() => Promise.reject("texto suelto"));

    expect(result).toEqual({
      ok: false,
      error: { code: INTERNAL_ERROR_CODE, message: INTERNAL_ERROR_MESSAGE },
    });
  });
});

describe("toActionResult con la base que no responde", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("encuentra el error de la base aunque Drizzle lo envuelva", async () => {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const wrapped = new Error("Failed query: select 1", {
      cause: new DatabaseUnavailableError({ cause: new Error("Query read timeout") }),
    });

    const result = await toActionResult(() => Promise.reject(wrapped));

    expect(result).toEqual({
      ok: false,
      error: { code: "DATABASE_UNAVAILABLE", message: "No pudimos guardar el cambio. Probá de nuevo." },
    });
  });

  it("registra la caída como aviso y no como error interno", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(logger, "error").mockImplementation(() => undefined);

    await toActionResult(() => Promise.reject(new DatabaseUnavailableError()));

    expect(warn).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });

  it("reconoce el error de la base aunque venga de otra copia del módulo, como pasa entre bundles de Next", async () => {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    vi.resetModules();
    const otherCopy = await import("@/shared/app-error");
    const fromOtherBundle = new otherCopy.DatabaseUnavailableError();

    const result = await toActionResult(() => Promise.reject(new Error("Failed query", { cause: fromOtherBundle })));

    expect(fromOtherBundle).not.toBeInstanceOf(DatabaseUnavailableError);
    expect(result).toEqual({
      ok: false,
      error: { code: "DATABASE_UNAVAILABLE", message: "No pudimos guardar el cambio. Probá de nuevo." },
    });
  });

  it("sigue dando el mensaje genérico si lo envuelto no es un error de la app", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => undefined);
    const wrapped = new Error("Failed query", { cause: new Error("syntax error at or near") });

    const result = await toActionResult(() => Promise.reject(wrapped));

    expect(result).toEqual({
      ok: false,
      error: { code: INTERNAL_ERROR_CODE, message: INTERNAL_ERROR_MESSAGE },
    });
  });
});

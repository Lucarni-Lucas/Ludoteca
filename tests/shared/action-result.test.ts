import { afterEach, describe, expect, it, vi } from "vitest";

import {
  INTERNAL_ERROR_CODE,
  INTERNAL_ERROR_MESSAGE,
  toActionResult,
} from "@/shared/action-result";
import { AppError, InvalidRequestError } from "@/shared/app-error";
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

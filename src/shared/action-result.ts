import { AppError } from "@/shared/app-error";
import { logger } from "@/shared/logger";

export const INTERNAL_ERROR_CODE = "INTERNAL_ERROR";
export const INTERNAL_ERROR_MESSAGE = "Algo salió mal. Probá de nuevo.";

export type ActionFailure = {
  readonly ok: false;
  readonly error: { readonly code: string; readonly message: string };
};

export type ActionResult<T> = { readonly ok: true; readonly data: T } | ActionFailure;

function toFailure(error: unknown): ActionFailure {
  if (error instanceof AppError) {
    return { ok: false, error: { code: error.code, message: error.message } };
  }

  logger.error("Error inesperado en una acción", { error });
  return { ok: false, error: { code: INTERNAL_ERROR_CODE, message: INTERNAL_ERROR_MESSAGE } };
}

/**
 * Único traductor de errores a la respuesta del navegador.
 * `redirect()` de Next funciona lanzando una excepción: hay que llamarlo fuera de este manejador.
 */
export async function toActionResult<T>(action: () => Promise<T> | T): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    return toFailure(error);
  }
}

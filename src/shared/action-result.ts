import { type AppError, DATABASE_UNAVAILABLE_CODE, isAppError } from "@/shared/app-error";
import { logger } from "@/shared/logger";

export const INTERNAL_ERROR_CODE = "INTERNAL_ERROR";
export const INTERNAL_ERROR_MESSAGE = "Algo salió mal. Probá de nuevo.";

export type ActionFailure = {
  readonly ok: false;
  readonly error: { readonly code: string; readonly message: string };
};

export type ActionResult<T> = { readonly ok: true; readonly data: T } | ActionFailure;

const MAX_CAUSE_DEPTH = 10;

/** Drizzle envuelve en `DrizzleQueryError` lo que tira el driver: el error de la app puede estar adentro. */
function findAppError(error: unknown): AppError | null {
  let current = error;

  for (let depth = 0; current instanceof Error && depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (isAppError(current)) {
      return current;
    }

    current = current.cause;
  }

  return null;
}

function toFailure(error: unknown): ActionFailure {
  const appError = findAppError(error);

  if (appError) {
    if (appError.code === DATABASE_UNAVAILABLE_CODE) {
      logger.warn("La base no respondió", { error });
    }

    return { ok: false, error: { code: appError.code, message: appError.message } };
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

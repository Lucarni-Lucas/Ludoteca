import { translateError } from "@/i18n/translator";
import { DATABASE_UNAVAILABLE_CODE, type ErrorParams, findAppError, INTERNAL_ERROR_CODE } from "@/shared/app-error";
import { logger } from "@/shared/logger";

export { INTERNAL_ERROR_CODE } from "@/shared/app-error";

export type ActionFailure = {
  readonly ok: false;
  readonly error: { readonly code: string; readonly message: string };
};

export type ActionResult<T> = { readonly ok: true; readonly data: T } | ActionFailure;

async function failure(code: string, messageKey: string, params?: ErrorParams): Promise<ActionFailure> {
  return { ok: false, error: { code, message: await translateError(messageKey, params) } };
}

/** Para lo que no pasa por `toActionResult`, como el rechazo de un Route Handler sin sesión. */
export function toActionFailure(error: unknown): Promise<ActionFailure> {
  const appError = findAppError(error);

  if (appError) {
    if (appError.code === DATABASE_UNAVAILABLE_CODE) {
      logger.warn("La base no respondió", { error });
    }

    return failure(appError.code, appError.messageKey ?? `errors.${appError.code}`, appError.params);
  }

  logger.error("Error inesperado en una acción", { error });
  return failure(INTERNAL_ERROR_CODE, `errors.${INTERNAL_ERROR_CODE}`);
}

/**
 * Único traductor de errores a la respuesta del navegador, en el idioma del pedido.
 * `redirect()` de Next funciona lanzando una excepción: hay que llamarlo fuera de este manejador.
 */
export async function toActionResult<T>(action: () => Promise<T> | T): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    return toActionFailure(error);
  }
}

import type { z } from "zod";

import { InvalidRequestError } from "@/shared/app-error";

const GENERIC_MESSAGE = "El pedido no es válido.";

/**
 * Valida la forma de un pedido. Un esquema da su propio mensaje en los campos que el usuario completa;
 * el resto cae en el genérico, para que nunca llegue al navegador un mensaje interno de Zod.
 */
export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input, { error: () => GENERIC_MESSAGE });

  if (!result.success) {
    throw new InvalidRequestError(result.error.issues[0]?.message);
  }

  return result.data;
}

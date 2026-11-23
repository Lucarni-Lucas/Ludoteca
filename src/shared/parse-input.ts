import type { z } from "zod";

import { InvalidRequestError } from "@/shared/app-error";

// Marca los problemas sin clave propia, para que nunca llegue al navegador un mensaje interno de Zod.
const NO_VALIDATION_KEY = "";

/**
 * Valida la forma de un pedido. Un esquema pone como `error` una clave de `validation` en los campos que
 * completa el usuario, y el manejador la traduce; el resto cae en el texto genérico.
 */
export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input, { error: () => NO_VALIDATION_KEY });

  if (!result.success) {
    throw new InvalidRequestError(result.error.issues[0]?.message || undefined);
  }

  return result.data;
}

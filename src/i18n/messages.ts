import type { Locale } from "@/model/account/locale";

import en from "./messages/en.json";
import es from "./messages/es.json";

export type Messages = typeof es;

/** Lo que un esquema de Zod pone como `error`: el manejador lo busca en `validation`. */
export type ValidationKey = keyof Messages["validation"];

// Son chicos y se usan en cada pedido: importarlos de entrada evita una carga por pedido.
export const MESSAGES: Readonly<Record<Locale, Messages>> = { es, en };

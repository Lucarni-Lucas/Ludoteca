import { createTranslator } from "next-intl";

import { DEFAULT_LOCALE, type Locale } from "@/model/account/locale";
import { type ErrorParams, INTERNAL_ERROR_CODE } from "@/shared/app-error";
import { logger } from "@/shared/logger";

import { getRequestLocale } from "./locale";
import { MESSAGES } from "./messages";

type CatalogKey = Parameters<ReturnType<typeof catalogTranslator>>[0];

const INTERNAL_ERROR_KEY: CatalogKey = `errors.${INTERNAL_ERROR_CODE}`;

function catalogTranslator(locale: Locale) {
  return createTranslator({ locale, messages: MESSAGES[locale] });
}

/** El manejador de errores nunca puede fallar: si no se sabe el idioma del pedido, usa el de por defecto. */
async function requestLocaleOrDefault(): Promise<Locale> {
  try {
    return await getRequestLocale();
  } catch (error) {
    logger.error("No se pudo leer el idioma del pedido para un mensaje de error", { error });
    return DEFAULT_LOCALE;
  }
}

/** El texto de una clave de error (`errors.<code>` o `validation.<clave>`); una clave sin texto da el genérico. */
export function translateErrorIn(locale: Locale, key: string, params: ErrorParams = {}): string {
  const t = catalogTranslator(locale);

  if (!t.has(key as CatalogKey)) {
    logger.error("Un error no tiene su texto en el catálogo", { key, locale });
    return t(INTERNAL_ERROR_KEY);
  }

  return t(key as CatalogKey, params);
}

/** El texto de un error en el idioma del pedido. */
export async function translateError(key: string, params?: ErrorParams): Promise<string> {
  return translateErrorIn(await requestLocaleOrDefault(), key, params);
}

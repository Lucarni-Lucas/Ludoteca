import { headers } from "next/headers";
import { cache } from "react";

import { type Locale, resolveLocale } from "@/model/account/locale";
import type { SessionUser } from "@/model/account/session-user";
import { getSessionUser } from "@/security/session";
import { getSettingsService } from "@/service/account/instance";
import { DATABASE_UNAVAILABLE_CODE, findAppError } from "@/shared/app-error";
import { logger } from "@/shared/logger";

export type RequestLocaleSources = Readonly<{
  sessionUser(): Promise<SessionUser | null>;
  chosenLocale(userId: string): Promise<Locale | null>;
  acceptLanguage(): Promise<string | null>;
}>;

async function readChosenLocale(sources: RequestLocaleSources): Promise<Locale | null> {
  const user = await sources.sessionUser();
  if (!user) {
    return null;
  }

  try {
    return await sources.chosenLocale(user.id);
  } catch (error) {
    // El idioma nunca es motivo para que una pantalla falle: sin la base, vale el del navegador.
    if (findAppError(error)?.code !== DATABASE_UNAVAILABLE_CODE) {
      throw error;
    }

    logger.warn("La base no respondió al leer el idioma; se usa el del navegador", { error });
    return null;
  }
}

/** Lo elegido en la cuenta, si hay sesión y la base responde; si no, el idioma del navegador. */
export async function readRequestLocale(sources: RequestLocaleSources): Promise<Locale> {
  const chosen = await readChosenLocale(sources);
  return resolveLocale(chosen, await sources.acceptLanguage());
}

/** Con cache, el layout, la página y la acción de un mismo pedido lo calculan una sola vez. */
export const getRequestLocale = cache(
  (): Promise<Locale> =>
    readRequestLocale({
      sessionUser: getSessionUser,
      chosenLocale: (userId) => getSettingsService().getLocale(userId),
      acceptLanguage: async () => (await headers()).get("accept-language"),
    }),
);

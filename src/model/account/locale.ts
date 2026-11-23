export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

const SPANISH_LANGUAGE = "es";
const DEFAULT_QUALITY = 1;
const QUALITY_PREFIX = "q=";

type LanguageRange = Readonly<{ language: string; quality: number }>;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

function parseQuality(params: readonly string[]): number | null {
  const qualityParam = params.map((param) => param.trim()).find((param) => param.startsWith(QUALITY_PREFIX));
  if (!qualityParam) {
    return DEFAULT_QUALITY;
  }

  const quality = Number(qualityParam.slice(QUALITY_PREFIX.length));
  return Number.isFinite(quality) && quality >= 0 && quality <= DEFAULT_QUALITY ? quality : null;
}

function parseRange(entry: string): LanguageRange | null {
  const [tag = "", ...params] = entry.split(";");
  const language = tag.trim().split("-")[0]?.toLowerCase() ?? "";
  const quality = parseQuality(params);

  if (!/^[a-z]+$/.test(language) || quality === null) {
    return null;
  }

  return { language, quality };
}

function preferredLanguage(acceptLanguage: string): string | null {
  let preferred: LanguageRange | null = null;

  for (const entry of acceptLanguage.split(",")) {
    const range = parseRange(entry);
    // A igual `q`, gana la que aparece primero: por eso solo se reemplaza con una mayor.
    if (range && (preferred === null || range.quality > preferred.quality)) {
      preferred = range;
    }
  }

  return preferred?.language ?? null;
}

/** Español en cualquier variante si es el preferido del navegador; inglés en cualquier otro caso. */
export function browserLocale(acceptLanguage: string | null | undefined): Locale {
  return preferredLanguage(acceptLanguage ?? "") === SPANISH_LANGUAGE ? "es" : DEFAULT_LOCALE;
}

/** Lo elegido en la cuenta manda sobre el navegador. */
export function resolveLocale(chosen: Locale | null, acceptLanguage: string | null | undefined): Locale {
  return chosen ?? browserLocale(acceptLanguage);
}

// El español de la app es el rioplatense; el inglés, sin variante.
const HTML_LANG: Readonly<Record<Locale, string>> = { es: "es-AR", en: "en" };

/** Lo que declara `<html lang>`, para que un lector de pantalla pronuncie bien. */
export function htmlLang(locale: Locale): string {
  return HTML_LANG[locale];
}

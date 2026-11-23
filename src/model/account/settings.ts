import type { Locale } from "./locale";

export type UserSettings = Readonly<{
  /** Vacío mientras el usuario no elija: vale el idioma del navegador. */
  locale: Locale | null;
}>;

export type LocaleChange = "updated" | "unchanged";

/** Elegir el idioma que ya valía no cambia nada, y la pantalla lo dice. */
export function localeChange(current: Locale, chosen: Locale): LocaleChange {
  return current === chosen ? "unchanged" : "updated";
}

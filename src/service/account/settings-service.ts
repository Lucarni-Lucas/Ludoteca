import type { Locale } from "@/model/account/locale";
import { type LocaleChange, localeChange, type UserSettings } from "@/model/account/settings";

type UserSettingsStore = Readonly<{
  findByUser(userId: string): Promise<UserSettings | null>;
  saveLocale(userId: string, locale: Locale): Promise<void>;
}>;

type SettingsServiceDependencies = Readonly<{
  settingsRepo: UserSettingsStore;
}>;

export type SettingsService = Readonly<{
  /** El idioma elegido en la cuenta, o vacío si nunca eligió. */
  getLocale(userId: string): Promise<Locale | null>;
  /** `shown` es el idioma en el que el usuario ve la app ahora, elegido o del navegador. */
  chooseLocale(userId: string, chosen: Locale, shown: Locale): Promise<LocaleChange>;
}>;

export function createSettingsService({ settingsRepo }: SettingsServiceDependencies): SettingsService {
  return {
    async getLocale(userId) {
      const settings = await settingsRepo.findByUser(userId);
      return settings?.locale ?? null;
    },

    async chooseLocale(userId, chosen, shown) {
      // Se guarda aunque ya se viera en ese idioma: así vale también en los otros dispositivos.
      await settingsRepo.saveLocale(userId, chosen);
      return localeChange(shown, chosen);
    },
  };
}

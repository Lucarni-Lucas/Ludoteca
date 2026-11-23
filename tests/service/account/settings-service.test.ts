import { describe, expect, it, vi } from "vitest";

import type { Locale } from "@/model/account/locale";
import type { UserSettings } from "@/model/account/settings";
import { createSettingsService } from "@/service/account/settings-service";

const USER_ID = "usuario-de-la-sesion";

function createFakeRepository(initial: UserSettings | null = null) {
  let stored = initial;

  return {
    findByUser: vi.fn(async () => stored),
    saveLocale: vi.fn(async (_userId: string, locale: Locale) => {
      stored = { locale };
    }),
  };
}

describe("createSettingsService", () => {
  it("una cuenta sin elección devuelve vacío", async () => {
    const service = createSettingsService({ settingsRepo: createFakeRepository() });

    const locale = await service.getLocale(USER_ID);

    expect(locale).toBeNull();
  });

  it("elegir otro idioma da «updated» y lo guarda en la cuenta", async () => {
    const settingsRepo = createFakeRepository();
    const service = createSettingsService({ settingsRepo });

    const change = await service.chooseLocale(USER_ID, "en", "es");

    expect(change).toBe("updated");
    expect(await service.getLocale(USER_ID)).toBe("en");
  });

  it("elegir el mismo da «unchanged» y igual lo guarda para los otros dispositivos", async () => {
    const settingsRepo = createFakeRepository();
    const service = createSettingsService({ settingsRepo });

    const change = await service.chooseLocale(USER_ID, "es", "es");

    expect(change).toBe("unchanged");
    expect(settingsRepo.saveLocale).toHaveBeenCalledWith(USER_ID, "es");
  });
});

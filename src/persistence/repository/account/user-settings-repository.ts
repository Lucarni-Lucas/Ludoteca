import { eq } from "drizzle-orm";

import type { Locale } from "@/model/account/locale";
import type { UserSettings } from "@/model/account/settings";
import type { Database } from "@/persistence/db";
import { toUserSettings } from "@/persistence/mapper/account/user-settings-mapper";
import { userSettings } from "@/persistence/sql/account/user-settings";

export type UserSettingsRepository = Readonly<{
  findByUser(userId: string): Promise<UserSettings | null>;
  saveLocale(userId: string, locale: Locale): Promise<void>;
}>;

export function createUserSettingsRepository(db: Database): UserSettingsRepository {
  return {
    async findByUser(userId) {
      const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
      return row ? toUserSettings(row) : null;
    },

    async saveLocale(userId, locale) {
      // La primera elección crea la fila; las siguientes la actualizan, también si llegan dos a la vez.
      await db
        .insert(userSettings)
        .values({ userId, locale })
        .onConflictDoUpdate({ target: userSettings.userId, set: { locale, updatedAt: new Date() } });
    },
  };
}

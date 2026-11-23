import type { UserSettings } from "@/model/account/settings";
import type { userSettings } from "@/persistence/sql/account/user-settings";

export function toUserSettings(row: typeof userSettings.$inferSelect): UserSettings {
  return { locale: row.locale };
}

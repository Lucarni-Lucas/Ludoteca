import { getDatabase } from "@/persistence/db";
import { createAllowedEmailRepository } from "@/persistence/repository/account/allowed-email-repository";
import { createUserSettingsRepository } from "@/persistence/repository/account/user-settings-repository";
import { type AccountService, createAccountService } from "@/service/account/account-service";
import { createSettingsService, type SettingsService } from "@/service/account/settings-service";

let accountService: AccountService | undefined;
let settingsService: SettingsService | undefined;

/** Se arma al primer uso para que `next build` no necesite la conexión a la base. */
export function getAccountService(): AccountService {
  accountService ??= createAccountService({
    allowedEmailRepo: createAllowedEmailRepository(getDatabase()),
  });
  return accountService;
}

export function getSettingsService(): SettingsService {
  settingsService ??= createSettingsService({ settingsRepo: createUserSettingsRepository(getDatabase()) });
  return settingsService;
}

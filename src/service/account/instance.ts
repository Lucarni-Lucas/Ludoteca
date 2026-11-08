import { getDatabase } from "@/persistence/db";
import { createAllowedEmailRepository } from "@/persistence/repository/account/allowed-email-repository";
import { type AccountService, createAccountService } from "@/service/account/account-service";

let accountService: AccountService | undefined;

/** Se arma al primer uso para que `next build` no necesite la conexión a la base. */
export function getAccountService(): AccountService {
  accountService ??= createAccountService({
    allowedEmailRepo: createAllowedEmailRepository(getDatabase()),
  });
  return accountService;
}

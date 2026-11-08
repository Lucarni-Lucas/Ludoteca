import { assertEmailAllowed } from "@/model/account/access";

type AllowedEmailLookup = Readonly<{
  isAllowed(email: string): Promise<boolean>;
}>;

type AccountServiceDependencies = Readonly<{
  allowedEmailRepo: AllowedEmailLookup;
}>;

export type AccountService = Readonly<{
  ensureEmailAllowed(email: string): Promise<void>;
}>;

export function createAccountService({ allowedEmailRepo }: AccountServiceDependencies): AccountService {
  return {
    async ensureEmailAllowed(email) {
      assertEmailAllowed(await allowedEmailRepo.isAllowed(email));
    },
  };
}

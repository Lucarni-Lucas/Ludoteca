import { describe, expect, it } from "vitest";

import { EmailNotAllowedError } from "@/model/account/errors";
import { createAccountService } from "@/service/account/account-service";

function fakeRepository(allowedEmails: readonly string[]) {
  return { isAllowed: (email: string) => Promise.resolve(allowedEmails.includes(email)) };
}

describe("createAccountService", () => {
  it("deja pasar un mail permitido", async () => {
    const service = createAccountService({ allowedEmailRepo: fakeRepository(["lucas@example.com"]) });

    const check = service.ensureEmailAllowed("lucas@example.com");

    await expect(check).resolves.toBeUndefined();
  });

  it("rechaza un mail que no está en la lista", async () => {
    const service = createAccountService({ allowedEmailRepo: fakeRepository(["lucas@example.com"]) });

    const check = service.ensureEmailAllowed("otra@example.com");

    await expect(check).rejects.toBeInstanceOf(EmailNotAllowedError);
  });

  it("propaga el error cuando el repositorio falla, sin dejar pasar el mail", async () => {
    const failure = new Error("sin conexión");
    const service = createAccountService({ allowedEmailRepo: { isAllowed: () => Promise.reject(failure) } });

    const check = service.ensureEmailAllowed("lucas@example.com");

    await expect(check).rejects.toBe(failure);
  });
});

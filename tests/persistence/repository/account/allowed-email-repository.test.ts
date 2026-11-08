import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAllowedEmailRepository } from "@/persistence/repository/account/allowed-email-repository";
import { allowedEmail } from "@/persistence/sql/account/allowed-email";

import { createTestDatabase, type TestDatabase } from "../../pglite";

describe("createAllowedEmailRepository", () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = await createTestDatabase();
    await database.db.insert(allowedEmail).values({ email: "lucas@example.com" });
  });

  afterEach(async () => {
    await database.client.close();
  });

  it.each([
    { description: "está en la lista", email: "lucas@example.com", expected: true },
    { description: "no está en la lista", email: "otra@example.com", expected: false },
    { description: "está en la lista con otras mayúsculas", email: "LUCAS@Example.com", expected: true },
    { description: "solo contiene al de la lista", email: "xlucas@example.com", expected: false },
  ])("devuelve $expected cuando el mail $description", async ({ email, expected }) => {
    const repository = createAllowedEmailRepository(database.db);

    const allowed = await repository.isAllowed(email);

    expect(allowed).toBe(expected);
  });
});

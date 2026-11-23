import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createUserSettingsRepository,
  type UserSettingsRepository,
} from "@/persistence/repository/account/user-settings-repository";
import { userSettings } from "@/persistence/sql/account/user-settings";

import { createTestDatabase, type TestDatabase } from "../../pglite";
import { USER_A, USER_B } from "../users";

describe("createUserSettingsRepository", () => {
  let database: TestDatabase;
  let repository: UserSettingsRepository;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = createUserSettingsRepository(database.db);
  });

  afterEach(async () => {
    await database.client.close();
  });

  it("no encuentra ajustes de una cuenta que nunca eligió nada", async () => {
    const userId = USER_A;

    const settings = await repository.findByUser(userId);

    expect(settings).toBeNull();
  });

  it("guarda el idioma elegido", async () => {
    await repository.saveLocale(USER_A, "en");

    const settings = await repository.findByUser(USER_A);

    expect(settings).toEqual({ locale: "en" });
  });

  it("guardar dos veces actualiza la misma fila sin duplicarla", async () => {
    await repository.saveLocale(USER_A, "en");

    await repository.saveLocale(USER_A, "es");

    const rows = await database.db.select().from(userSettings);
    expect(rows).toHaveLength(1);
    expect(await repository.findByUser(USER_A)).toEqual({ locale: "es" });
  });

  it("el usuario A no ve ni cambia nada del B", async () => {
    await repository.saveLocale(USER_B, "es");

    await repository.saveLocale(USER_A, "en");

    expect(await repository.findByUser(USER_B)).toEqual({ locale: "es" });
    expect(await repository.findByUser(USER_A)).toEqual({ locale: "en" });
  });
});

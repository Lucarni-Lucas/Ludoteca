import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createProviderTokenRepository,
  type ProviderTokenRepository,
} from "@/persistence/repository/game/provider-token-repository";

import { createTestDatabase, type TestDatabase } from "../../pglite";

const TOKEN = { accessToken: "token", expiresAt: "2027-01-01T00:00:00.000Z" };

describe("createProviderTokenRepository", () => {
  let database: TestDatabase;
  let repository: ProviderTokenRepository;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = createProviderTokenRepository(database.db);
  });

  afterEach(async () => {
    await database.client.close();
  });

  it("devuelve null si no hay token guardado", async () => {
    const provider = "twitch";

    const token = await repository.find(provider);

    expect(token).toBeNull();
  });

  it("devuelve el token que se guardó", async () => {
    await repository.save("twitch", TOKEN);

    const token = await repository.find("twitch");

    expect(token).toEqual(TOKEN);
  });

  it("reemplaza el token anterior del mismo proveedor", async () => {
    await repository.save("twitch", TOKEN);
    const renewed = { accessToken: "otro", expiresAt: "2027-03-01T00:00:00.000Z" };

    await repository.save("twitch", renewed);

    expect(await repository.find("twitch")).toEqual(renewed);
  });
});

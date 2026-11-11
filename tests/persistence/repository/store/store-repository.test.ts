import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createStoreRepository, type StoreRepository } from "@/persistence/repository/store/store-repository";

import { createTestDatabase, type TestDatabase } from "../../pglite";
import { USER_A, USER_B } from "../users";

describe("createStoreRepository", () => {
  let database: TestDatabase;
  let repository: StoreRepository;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = createStoreRepository(database.db);
  });

  afterEach(async () => {
    await database.client.close();
  });

  it("ofrece las 12 tiendas conocidas a cualquier usuario", async () => {
    const userId = USER_A;

    const stores = await repository.listAvailable(userId);

    expect(stores).toHaveLength(12);
  });

  it("suma la tienda propia a las opciones de su dueño", async () => {
    await repository.insertOwn(USER_A, "Humble Store", "humble-store");

    const stores = await repository.listAvailable(USER_A);

    expect(stores.map(({ name }) => name)).toContain("Humble Store");
  });

  it("no duplica una tienda propia con el mismo slug", async () => {
    const first = await repository.insertOwn(USER_A, "Humble Store", "humble-store");

    const second = await repository.insertOwn(USER_A, "HUMBLE STORE", "humble-store");

    expect(second.id).toBe(first.id);
  });

  it("el usuario A no ve ni cambia nada del B", async () => {
    const storeOfA = await repository.insertOwn(USER_A, "Humble Store", "humble-store");

    const stores = await repository.listAvailable(USER_B);
    const found = await repository.findAvailable(USER_B, storeOfA.id);

    expect(stores.map(({ id }) => id)).not.toContain(storeOfA.id);
    expect(found).toBeNull();
  });
});

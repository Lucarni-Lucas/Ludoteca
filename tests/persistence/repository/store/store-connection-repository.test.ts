import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createStoreConnectionRepository,
  type StoreConnectionRepository,
} from "@/persistence/repository/store/store-connection-repository";
import { storeConnection } from "@/persistence/sql/store/store-connection";

import { createTestDatabase, type TestDatabase } from "../../pglite";
import { createRepositories, steamOf } from "../game/game-fixtures";
import { USER_A, USER_B } from "../users";

const STEAM_ID = "76561197960287930";
const OTHER_STEAM_ID = "76561198000000001";

describe("createStoreConnectionRepository", () => {
  let database: TestDatabase;
  let connections: StoreConnectionRepository;
  let steamId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    connections = createStoreConnectionRepository(database.db);
    steamId = (await steamOf(createRepositories(database), USER_A)).id;
  });

  afterEach(async () => {
    await database.client.close();
  });

  it("guarda la cuenta conectada y la encuentra por tienda", async () => {
    await connections.save(USER_A, { storeId: steamId, accountId: STEAM_ID });

    const found = await connections.findByStore(USER_A, steamId);

    expect(found).toEqual({ storeId: steamId, accountId: STEAM_ID, lastSyncedAt: null });
  });

  it("guardar dos veces no duplica y se queda con la última cuenta", async () => {
    await connections.save(USER_A, { storeId: steamId, accountId: STEAM_ID });

    await connections.save(USER_A, { storeId: steamId, accountId: OTHER_STEAM_ID });

    const rows = await database.db.select().from(storeConnection);
    expect(rows).toHaveLength(1);
    expect((await connections.findByStore(USER_A, steamId))?.accountId).toBe(OTHER_STEAM_ID);
  });

  it("sin cuenta conectada no encuentra nada", async () => {
    const storeId = steamId;

    const found = await connections.findByStore(USER_A, storeId);

    expect(found).toBeNull();
  });

  it("el usuario A no ve ni cambia nada del B", async () => {
    await connections.save(USER_A, { storeId: steamId, accountId: STEAM_ID });

    const seenByB = await connections.findByStore(USER_B, steamId);
    await connections.save(USER_B, { storeId: steamId, accountId: OTHER_STEAM_ID });

    expect(seenByB).toBeNull();
    expect((await connections.findByStore(USER_A, steamId))?.accountId).toBe(STEAM_ID);
    expect((await connections.findByStore(USER_B, steamId))?.accountId).toBe(OTHER_STEAM_ID);
  });
});

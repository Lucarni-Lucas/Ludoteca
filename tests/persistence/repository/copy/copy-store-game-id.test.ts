import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { copy } from "@/persistence/sql/copy/copy";
import { libraryGame } from "@/persistence/sql/game/library-game";

import { createTestDatabase, type TestDatabase } from "../../pglite";
import { createRepositories, entry, igdbData, type Repositories, seedStatuses, steamOf } from "../game/game-fixtures";
import { USER_A, USER_B } from "../users";

describe("copy con ID en la tienda", () => {
  let database: TestDatabase;
  let repositories: Repositories;
  let gameId: string;
  let storeId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    repositories = createRepositories(database);
    const statuses = await seedStatuses(repositories, USER_A);
    ({ gameId } = await repositories.games.addIgdbGame(USER_A, igdbData(1, "Hades"), entry(statuses)));
    storeId = (await steamOf(repositories, USER_A)).id;
  });

  afterEach(async () => {
    await database.client.close();
  });

  function importedCopy(userId: string, storeGameId: string | null) {
    return { userId, libraryGameId: gameId, storeId, kind: "purchased" as const, storeGameId, origin: "import" as const };
  }

  it("dos copias a mano sin ID en la tienda, en la misma tienda, no chocan", async () => {
    const purchased = { storeId, kind: "purchased" as const, acquiredOn: null, familyOwner: null };
    await repositories.copies.addCopy(USER_A, gameId, purchased);

    await repositories.copies.addCopy(USER_A, gameId, purchased);

    const game = await repositories.games.findById(USER_A, gameId);
    expect(game?.copies).toHaveLength(2);
  });

  it("dos copias con el mismo ID en la misma tienda chocan", async () => {
    await database.db.insert(copy).values(importedCopy(USER_A, "1145360"));

    const second = database.db.insert(copy).values(importedCopy(USER_A, "1145360"));

    await expect(second).rejects.toThrow();
  });

  it("el mismo ID en la tienda puede repetirse entre usuarios", async () => {
    await database.db.insert(copy).values(importedCopy(USER_A, "1145360"));

    const other = database.db.insert(copy).values(importedCopy(USER_B, "1145360"));

    await expect(other).resolves.toBeDefined();
  });

  it("una copia cargada a mano queda con origen manual", async () => {
    const purchased = { storeId, kind: "purchased" as const, acquiredOn: null, familyOwner: null };

    await repositories.copies.addCopy(USER_A, gameId, purchased);

    const [row] = await database.db.select().from(copy).where(eq(copy.libraryGameId, gameId));
    expect(row).toMatchObject({ origin: "manual", storeGameId: null });
  });
});

describe("library_game con duración de HowLongToBeat", () => {
  let database: TestDatabase;
  let repositories: Repositories;
  let gameId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    repositories = createRepositories(database);
    const statuses = await seedStatuses(repositories, USER_A);
    ({ gameId } = await repositories.games.addIgdbGame(USER_A, igdbData(2, "60 Seconds!"), entry(statuses)));
  });

  afterEach(async () => {
    await database.client.close();
  });

  it("devuelve la duración de HowLongToBeat cuando la tiene", async () => {
    await database.db.update(libraryGame).set({ hltbHours: 2.3 }).where(eq(libraryGame.id, gameId));

    const game = await repositories.games.findById(USER_A, gameId);

    expect(game?.hltbHours).toBeCloseTo(2.3, 5);
  });

  it("un juego sin duración de HowLongToBeat no trae el campo", async () => {
    const id = gameId;

    const game = await repositories.games.findById(USER_A, id);

    expect(game).not.toHaveProperty("hltbHours");
  });
});

import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { markCopyLost } from "@/model/copy/copy";
import { CopyNotFoundError } from "@/model/copy/errors";
import { GameNotFoundError } from "@/model/game/errors";
import type { Status } from "@/model/status/status";
import { journalEntry } from "@/persistence/sql/journal/journal-entry";

import { createTestDatabase, type TestDatabase } from "../../pglite";
import {
  createRepositories,
  entry,
  igdbData,
  type Repositories,
  seedStatuses,
  statusNamed,
  steamOf,
  TODAY,
} from "../game/game-fixtures";
import { MISSING_ID, USER_A, USER_B } from "../users";

describe("createCopyRepository", () => {
  let database: TestDatabase;
  let repositories: Repositories;
  let statusesA: readonly Status[];
  let gameId: string;
  let storeId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    repositories = createRepositories(database);
    statusesA = await seedStatuses(repositories, USER_A);
    ({ gameId } = await repositories.games.addIgdbGame(USER_A, igdbData(1, "Frostpunk"), entry(statusesA)));
    storeId = (await steamOf(repositories, USER_A)).id;
  });

  afterEach(async () => {
    await database.client.close();
  });

  const purchased = () => ({ storeId, kind: "purchased" as const, acquiredOn: null, familyOwner: null });

  async function addAndGetCopy() {
    await repositories.copies.addCopy(USER_A, gameId, purchased(), null);
    const game = await repositories.games.findById(USER_A, gameId);
    return game?.copies[0] ?? Promise.reject(new Error("sin copia"));
  }

  it("agrega la copia y aplica el paso a «Pendiente» en la misma operación", async () => {
    const wishlist = statusNamed(statusesA, "Quiero jugarlo");
    const backlog = statusNamed(statusesA, "Pendiente");
    const plan = {
      statusId: backlog.id,
      statusSince: TODAY,
      entry: { occurredOn: TODAY, fromStatusId: wishlist.id, toStatusId: backlog.id },
    };

    await repositories.copies.addCopy(USER_A, gameId, purchased(), plan);

    const game = await repositories.games.findById(USER_A, gameId);
    const [{ count }] = await database.db.select({ count: sql<number>`count(*)::int` }).from(journalEntry);
    expect(game?.copies).toHaveLength(1);
    expect(game?.status.name).toBe("Pendiente");
    expect(count).toBe(1);
  });

  it("si el paso de estado falla no queda la copia", async () => {
    const plan = {
      statusId: MISSING_ID,
      statusSince: TODAY,
      entry: { occurredOn: TODAY, fromStatusId: MISSING_ID, toStatusId: MISSING_ID },
    };

    const add = repositories.copies.addCopy(USER_A, gameId, purchased(), plan);

    await expect(add).rejects.toThrow();
    expect((await repositories.games.findById(USER_A, gameId))?.copies).toEqual([]);
  });

  it("marca una copia sin tocar su tipo ni su fecha, y la recupera", async () => {
    await repositories.copies.addCopy(USER_A, gameId, { ...purchased(), kind: "physical", acquiredOn: "2023-03-01" }, null);
    const [added] = (await repositories.games.findById(USER_A, gameId))?.copies ?? [];

    await repositories.copies.markLost(USER_A, added.id, markCopyLost(TODAY, "sold"));
    const [lost] = (await repositories.games.findById(USER_A, gameId))?.copies ?? [];
    await repositories.copies.recover(USER_A, added.id);
    const [recovered] = (await repositories.games.findById(USER_A, gameId))?.copies ?? [];

    expect(lost).toMatchObject({ kind: "physical", acquiredOn: "2023-03-01", lostAt: TODAY, lostReason: "sold" });
    expect(recovered).toMatchObject({ kind: "physical", acquiredOn: "2023-03-01", lostAt: null, lostReason: null });
  });

  it("elimina una copia sin dejar rastro", async () => {
    const added = await addAndGetCopy();

    await repositories.copies.remove(USER_A, added.id);

    expect((await repositories.games.findById(USER_A, gameId))?.copies).toEqual([]);
  });

  it("rechaza una copia que no existe", async () => {
    const copyId = MISSING_ID;

    const removal = repositories.copies.remove(USER_A, copyId);

    await expect(removal).rejects.toBeInstanceOf(CopyNotFoundError);
  });

  it("el usuario A no ve ni cambia nada del B", async () => {
    const added = await addAndGetCopy();
    await seedStatuses(repositories, USER_B);

    const lost = repositories.copies.markLost(USER_B, added.id, markCopyLost(TODAY, "sold"));
    const recover = repositories.copies.recover(USER_B, added.id);
    const removal = repositories.copies.remove(USER_B, added.id);
    const add = repositories.copies.addCopy(USER_B, gameId, purchased(), null);

    await expect(lost).rejects.toBeInstanceOf(CopyNotFoundError);
    await expect(recover).rejects.toBeInstanceOf(CopyNotFoundError);
    await expect(removal).rejects.toBeInstanceOf(CopyNotFoundError);
    await expect(add).rejects.toBeInstanceOf(GameNotFoundError);
    const game = await repositories.games.findById(USER_A, gameId);
    expect(game?.copies).toHaveLength(1);
    expect(game?.copies[0].lostAt).toBeNull();
  });
});

describe("createCopyRepository con copias de tipo Otro", () => {
  let database: TestDatabase;
  let repositories: Repositories;
  let gameId: string;
  let storeId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    repositories = createRepositories(database);
    const statuses = await seedStatuses(repositories, USER_A);
    ({ gameId } = await repositories.games.addIgdbGame(USER_A, igdbData(2, "Celeste"), entry(statuses)));
    storeId = (await steamOf(repositories, USER_A)).id;
  });

  afterEach(async () => {
    await database.client.close();
  });

  it("guarda el tipo Otro con su detalle, con la migración nueva", async () => {
    const gift = { storeId, kind: "other" as const, acquiredOn: null, familyOwner: null, kindDetail: "Regalo" };

    await repositories.copies.addCopy(USER_A, gameId, gift, null);

    const [saved] = (await repositories.games.findById(USER_A, gameId))?.copies ?? [];
    expect(saved).toMatchObject({ kind: "other", kindDetail: "Regalo" });
  });

  it("una copia Otro sin detalle no trae detalle", async () => {
    const other = { storeId, kind: "other" as const, acquiredOn: null, familyOwner: null };

    await repositories.copies.addCopy(USER_A, gameId, other, null);

    const [saved] = (await repositories.games.findById(USER_A, gameId))?.copies ?? [];
    expect(saved.kind).toBe("other");
    expect(saved.kindDetail).toBeUndefined();
  });

  it("marcarla «Ya no lo tengo» conserva su detalle", async () => {
    const gift = { storeId, kind: "other" as const, acquiredOn: null, familyOwner: null, kindDetail: "Regalo" };
    await repositories.copies.addCopy(USER_A, gameId, gift, null);
    const [added] = (await repositories.games.findById(USER_A, gameId))?.copies ?? [];

    await repositories.copies.markLost(USER_A, added.id, markCopyLost(TODAY, "other"));

    const [lost] = (await repositories.games.findById(USER_A, gameId))?.copies ?? [];
    expect(lost).toMatchObject({ kind: "other", kindDetail: "Regalo", lostAt: TODAY, lostReason: "other" });
  });
});

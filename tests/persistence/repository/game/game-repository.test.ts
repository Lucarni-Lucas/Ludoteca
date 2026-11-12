import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GameAlreadyInLibraryError, GameNotFoundError } from "@/model/game/errors";
import { planGameRemoval } from "@/model/game/removal";
import type { Status } from "@/model/status/status";
import { copy } from "@/persistence/sql/copy/copy";
import { catalogGame } from "@/persistence/sql/game/catalog-game";
import { libraryGame } from "@/persistence/sql/game/library-game";
import { journalEntry } from "@/persistence/sql/journal/journal-entry";

import { createTestDatabase, type TestDatabase } from "../../pglite";
import { MISSING_ID, USER_A, USER_B } from "../users";
import {
  createRepositories,
  entry,
  igdbData,
  MANUAL_DATA,
  type Repositories,
  seedStatuses,
  statusNamed,
  steamOf,
  TODAY,
} from "./game-fixtures";

describe("createGameRepository", () => {
  let database: TestDatabase;
  let repositories: Repositories;
  let statusesA: readonly Status[];
  let statusesB: readonly Status[];

  beforeEach(async () => {
    database = await createTestDatabase();
    repositories = createRepositories(database);
    statusesA = await seedStatuses(repositories, USER_A);
    statusesB = await seedStatuses(repositories, USER_B);
  });

  afterEach(async () => {
    await database.client.close();
  });

  async function addIgdb(userId: string, igdbId: number, title: string, statuses = statusesA): Promise<string> {
    const { gameId } = await repositories.games.addIgdbGame(userId, igdbData(igdbId, title), entry(statuses));
    return gameId;
  }

  async function addCopyTo(userId: string, gameId: string): Promise<void> {
    const steam = await steamOf(repositories, userId);
    await repositories.copies.addCopy(
      userId,
      gameId,
      { storeId: steam.id, kind: "purchased", acquiredOn: null, familyOwner: null },
      null,
    );
  }

  function countRows(table: typeof copy | typeof journalEntry | typeof catalogGame | typeof libraryGame) {
    return database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(table)
      .then(([{ count }]) => count);
  }

  describe("lecturas", () => {
    it("devuelve la biblioteca con sus copias y su estado", async () => {
      const gameId = await addIgdb(USER_A, 1, "Hades");
      await addCopyTo(USER_A, gameId);

      const [game] = await repositories.games.listLibrary(USER_A);

      expect(game).toMatchObject({
        id: gameId,
        title: "Hades",
        igdbId: 1,
        source: "igdb",
        statusSince: TODAY,
        score: null,
        notInterested: false,
        catalog: { estimatedHours: 22, endless: false },
        corrections: { estimatedHours: null, endless: null, coverUrl: null },
        status: { name: "Pendiente" },
      });
      expect(game.copies.map(({ storeName, kind }) => ({ storeName, kind }))).toEqual([
        { storeName: "Steam", kind: "purchased" },
      ]);
    });

    it("devuelve null para un juego que no existe", async () => {
      const gameId = MISSING_ID;

      const game = await repositories.games.findById(USER_A, gameId);

      expect(game).toBeNull();
    });

    it("devuelve las marcas de los juegos que tiene el usuario", async () => {
      const gameId = await addIgdb(USER_A, 1, "Hades");

      const marks = await repositories.games.findOwnedMarks(USER_A, [1, 2]);

      expect(marks).toEqual([{ igdbId: 1, gameId, statusSystemKey: "backlog" }]);
    });

    it("no consulta nada si no hay ids", async () => {
      const igdbIds: readonly number[] = [];

      const marks = await repositories.games.findOwnedMarks(USER_A, igdbIds);

      expect(marks).toEqual([]);
    });

    it("el usuario A no ve ni cambia nada del B", async () => {
      const gameOfB = await addIgdb(USER_B, 1, "Hades", statusesB);

      const library = await repositories.games.listLibrary(USER_A);
      const found = await repositories.games.findById(USER_A, gameOfB);
      const marks = await repositories.games.findOwnedMarks(USER_A, [1]);
      const update = repositories.games.updateScore(USER_A, gameOfB, 9);

      expect(library).toEqual([]);
      expect(found).toBeNull();
      expect(marks).toEqual([]);
      await expect(update).rejects.toBeInstanceOf(GameNotFoundError);
      expect((await repositories.games.findById(USER_B, gameOfB))?.score).toBeNull();
    });

    it("un juego a mano ajeno no se ve", async () => {
      const gameOfB = await repositories.games.addManualGame(USER_B, MANUAL_DATA, entry(statusesB));

      const library = await repositories.games.listLibrary(USER_A);
      const found = await repositories.games.findById(USER_A, gameOfB);

      expect(library).toEqual([]);
      expect(found).toBeNull();
    });
  });

  describe("agregar", () => {
    it("agrega un juego de IGDB con su copia", async () => {
      const steam = await steamOf(repositories, USER_A);
      const withCopy = {
        ...entry(statusesA),
        copies: [{ storeId: steam.id, kind: "free" as const, acquiredOn: "2026-01-02", familyOwner: null }],
      };

      const result = await repositories.games.addIgdbGame(USER_A, igdbData(1, "Hades"), withCopy);

      const game = await repositories.games.findById(USER_A, result.gameId);
      expect(result.kind).toBe("added");
      expect(game?.copies).toHaveLength(1);
      expect(game?.copies[0]).toMatchObject({ kind: "free", acquiredOn: "2026-01-02", storeName: "Steam" });
    });

    it("si falla la copia no queda el juego", async () => {
      const broken = {
        ...entry(statusesA),
        copies: [{ storeId: MISSING_ID, kind: "purchased" as const, acquiredOn: null, familyOwner: null }],
      };

      const add = repositories.games.addIgdbGame(USER_A, igdbData(1, "Hades"), broken);

      await expect(add).rejects.toThrow();
      expect(await repositories.games.listLibrary(USER_A)).toEqual([]);
      expect(await countRows(catalogGame)).toBe(0);
    });

    it("el mismo juego no se crea dos veces por usuario", async () => {
      const first = await addIgdb(USER_A, 1, "Hades");

      const second = await repositories.games.addIgdbGame(USER_A, igdbData(1, "Hades"), entry(statusesA));

      expect(second).toEqual({ kind: "already_in_library", gameId: first });
      expect(await repositories.games.listLibrary(USER_A)).toHaveLength(1);
    });

    it("dos usuarios comparten la fila del catálogo", async () => {
      await addIgdb(USER_A, 1, "Hades");

      await addIgdb(USER_B, 1, "Hades", statusesB);

      expect(await countRows(catalogGame)).toBe(1);
      expect(await countRows(libraryGame)).toBe(2);
    });

    it("un juego a mano queda con su dueño", async () => {
      const gameId = await repositories.games.addManualGame(USER_A, MANUAL_DATA, entry(statusesA));

      const game = await repositories.games.findById(USER_A, gameId);

      const [catalog] = await database.db.select().from(catalogGame);
      expect(game?.source).toBe("manual");
      expect(game?.igdbId).toBeNull();
      expect(catalog.ownerId).toBe(USER_A);
    });

    it("guarda el estado y su fecha", async () => {
      const gameId = await addIgdb(USER_A, 1, "Hades");

      const game = await repositories.games.findById(USER_A, gameId);

      expect(game?.status.name).toBe("Pendiente");
      expect(game?.statusSince).toBe(TODAY);
    });
  });

  describe("applyStatusChange", () => {
    it("Cambio registrado", async () => {
      const gameId = await addIgdb(USER_A, 1, "Elden Ring");
      const from = statusNamed(statusesA, "Pendiente");
      const to = statusNamed(statusesA, "Lo probé");
      const plan = {
        statusId: to.id,
        statusSince: TODAY,
        entry: { occurredOn: TODAY, fromStatusId: from.id, toStatusId: to.id },
      };

      await repositories.games.applyStatusChange(USER_A, gameId, plan);

      const game = await repositories.games.findById(USER_A, gameId);
      const entries = await database.db.select().from(journalEntry);
      expect(game?.status.name).toBe("Lo probé");
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        userId: USER_A,
        libraryGameId: gameId,
        kind: "status_change",
        occurredOn: TODAY,
        fromStatusId: from.id,
        toStatusId: to.id,
      });
    });

    it("Cambio sobre datos ajenos", async () => {
      const gameOfB = await addIgdb(USER_B, 1, "Elden Ring", statusesB);
      const from = statusNamed(statusesB, "Pendiente");
      const to = statusNamed(statusesB, "Lo probé");
      const plan = {
        statusId: to.id,
        statusSince: TODAY,
        entry: { occurredOn: TODAY, fromStatusId: from.id, toStatusId: to.id },
      };

      const change = repositories.games.applyStatusChange(USER_A, gameOfB, plan);

      await expect(change).rejects.toBeInstanceOf(GameNotFoundError);
      expect((await repositories.games.findById(USER_B, gameOfB))?.status.name).toBe("Pendiente");
      expect(await countRows(journalEntry)).toBe(0);
    });
  });

  describe("correcciones, puntaje y sin interés", () => {
    it("Corregir la duración", async () => {
      const gameOfA = await addIgdb(USER_A, 1, "Disco Elysium");
      const gameOfB = await addIgdb(USER_B, 1, "Disco Elysium", statusesB);

      await repositories.games.updateCorrections(USER_A, gameOfA, {
        estimatedHours: 30,
        endless: null,
        coverUrl: null,
      });

      const mine = await repositories.games.findById(USER_A, gameOfA);
      const theirs = await repositories.games.findById(USER_B, gameOfB);
      expect(mine?.corrections.estimatedHours).toBe(30);
      expect(theirs?.corrections.estimatedHours).toBeNull();
      expect(theirs?.catalog.estimatedHours).toBe(22);
    });

    it("guarda un puntaje con un decimal y lo puede quitar", async () => {
      const gameId = await addIgdb(USER_A, 1, "Hades");

      await repositories.games.updateScore(USER_A, gameId, 9.4);
      const scored = await repositories.games.findById(USER_A, gameId);
      await repositories.games.updateScore(USER_A, gameId, null);
      const cleared = await repositories.games.findById(USER_A, gameId);

      expect(scored?.score).toBeCloseTo(9.4, 10);
      expect(cleared?.score).toBeNull();
    });

    it("Marcar varios", async () => {
      const ids = await Promise.all(
        Array.from({ length: 20 }, (_, index) => addIgdb(USER_A, index + 1, `Juego ${index + 1}`)),
      );

      await repositories.games.setNotInterested(USER_A, ids, true);

      const library = await repositories.games.listLibrary(USER_A);
      expect(library).toHaveLength(20);
      expect(library.every(({ notInterested }) => notInterested)).toBe(true);
    });

    it("marcar «Sin interés» no alcanza los juegos de otro usuario", async () => {
      const gameOfB = await addIgdb(USER_B, 1, "Hades", statusesB);

      await repositories.games.setNotInterested(USER_A, [gameOfB], true);

      expect((await repositories.games.findById(USER_B, gameOfB))?.notInterested).toBe(false);
    });
  });

  describe("vincular y actualizar", () => {
    it("Vínculo sin pérdida", async () => {
      const gameId = await repositories.games.addManualGame(USER_A, MANUAL_DATA, entry(statusesA));
      await addCopyTo(USER_A, gameId);
      await repositories.games.updateScore(USER_A, gameId, 8);
      const before = await repositories.games.findById(USER_A, gameId);

      await repositories.games.linkToIgdb(
        USER_A,
        { id: gameId, catalogGameId: before?.catalogGameId ?? "" },
        igdbData(5, "Cartas del Faro (IGDB)"),
      );

      const after = await repositories.games.findById(USER_A, gameId);
      expect(after).toMatchObject({
        id: gameId,
        title: "Cartas del Faro (IGDB)",
        source: "igdb",
        igdbId: 5,
        score: 8,
        status: { name: "Pendiente" },
      });
      expect(after?.copies).toHaveLength(1);
      expect(await database.db.select().from(catalogGame).where(eq(catalogGame.source, "manual"))).toEqual([]);
    });

    it("rechaza vincular a un juego que ya tiene y deja todo igual", async () => {
      await addIgdb(USER_A, 5, "Ya lo tengo");
      const gameId = await repositories.games.addManualGame(USER_A, MANUAL_DATA, entry(statusesA));
      const before = await repositories.games.findById(USER_A, gameId);

      const link = repositories.games.linkToIgdb(
        USER_A,
        { id: gameId, catalogGameId: before?.catalogGameId ?? "" },
        igdbData(5, "Ya lo tengo"),
      );

      await expect(link).rejects.toBeInstanceOf(GameAlreadyInLibraryError);
      expect((await repositories.games.findById(USER_A, gameId))?.source).toBe("manual");
    });

    it("Actualizar con una corrección propia", async () => {
      const gameId = await addIgdb(USER_A, 1, "Hades");
      await repositories.games.updateCorrections(USER_A, gameId, {
        estimatedHours: 30,
        endless: null,
        coverUrl: null,
      });
      const before = await repositories.games.findById(USER_A, gameId);

      await repositories.games.updateCatalogFromIgdb(
        before?.catalogGameId ?? "",
        igdbData(1, "Hades II", { estimatedHours: 40 }),
      );

      const after = await repositories.games.findById(USER_A, gameId);
      expect(after?.title).toBe("Hades II");
      expect(after?.catalog.estimatedHours).toBe(40);
      expect(after?.corrections.estimatedHours).toBe(30);
    });
  });

  describe("removeFromLibrary", () => {
    async function remove(userId: string, gameId: string): Promise<void> {
      const game = await repositories.games.findById(userId, gameId);
      await repositories.games.removeFromLibrary(userId, planGameRemoval(game ?? (await Promise.reject(new Error()))));
    }

    it("Quitar un juego agregado por error", async () => {
      const gameId = await addIgdb(USER_A, 1, "Outer Wilds");
      await addCopyTo(USER_A, gameId);
      const from = statusNamed(statusesA, "Pendiente");
      const to = statusNamed(statusesA, "Jugando");
      await repositories.games.applyStatusChange(USER_A, gameId, {
        statusId: to.id,
        statusSince: TODAY,
        entry: { occurredOn: TODAY, fromStatusId: from.id, toStatusId: to.id },
      });

      await remove(USER_A, gameId);

      expect(await repositories.games.listLibrary(USER_A)).toEqual([]);
      expect(await countRows(copy)).toBe(0);
      expect(await countRows(journalEntry)).toBe(0);
    });

    it("Volver a agregarlo", async () => {
      const gameId = await addIgdb(USER_A, 1, "Outer Wilds");
      await repositories.games.updateScore(USER_A, gameId, 9);
      await addCopyTo(USER_A, gameId);
      await remove(USER_A, gameId);

      const newId = await addIgdb(USER_A, 1, "Outer Wilds");

      const game = await repositories.games.findById(USER_A, newId);
      expect(newId).not.toBe(gameId);
      expect(game).toMatchObject({ score: null, copies: [] });
    });

    it("Juego cargado a mano", async () => {
      const gameId = await repositories.games.addManualGame(USER_A, MANUAL_DATA, entry(statusesA));

      await remove(USER_A, gameId);

      expect(await countRows(catalogGame)).toBe(0);
      expect(await repositories.games.listLibrary(USER_A)).toEqual([]);
    });

    it("Juego de IGDB que otro usuario tiene", async () => {
      const gameOfA = await addIgdb(USER_A, 1, "Hades");
      const gameOfB = await addIgdb(USER_B, 1, "Hades", statusesB);

      await remove(USER_A, gameOfA);

      expect((await repositories.games.findById(USER_B, gameOfB))?.title).toBe("Hades");
    });

    it("A no puede quitar un juego de B", async () => {
      const gameOfB = await addIgdb(USER_B, 1, "Hades", statusesB);
      const game = await repositories.games.findById(USER_B, gameOfB);

      const removal = repositories.games.removeFromLibrary(USER_A, planGameRemoval(game ?? (await Promise.reject())));

      await expect(removal).rejects.toBeInstanceOf(GameNotFoundError);
      expect(await repositories.games.findById(USER_B, gameOfB)).not.toBeNull();
    });

    it("la fila de IGDB queda aunque nadie más lo tenga", async () => {
      const gameId = await addIgdb(USER_A, 1, "Hades");

      await remove(USER_A, gameId);

      expect(await countRows(catalogGame)).toBe(1);
    });

    it("si falla el borrado del catálogo el juego sigue entero", async () => {
      const gameId = await repositories.games.addManualGame(USER_A, MANUAL_DATA, entry(statusesA));
      const game = await repositories.games.findById(USER_A, gameId);
      // Otra fila que referencia el catálogo hace que su borrado viole la clave foránea.
      await database.db.insert(libraryGame).values({
        userId: USER_B,
        catalogGameId: game?.catalogGameId ?? "",
        statusId: statusNamed(statusesB, "Pendiente").id,
        statusSince: TODAY,
      });

      const removal = repositories.games.removeFromLibrary(USER_A, planGameRemoval(game ?? (await Promise.reject())));

      await expect(removal).rejects.toThrow();
      expect(await repositories.games.findById(USER_A, gameId)).not.toBeNull();
    });
  });
});

describe("createGameRepository al agregar con varias copias y puntaje", () => {
  let database: TestDatabase;
  let repositories: Repositories;
  let statuses: readonly Status[];

  beforeEach(async () => {
    database = await createTestDatabase();
    repositories = createRepositories(database);
    statuses = await seedStatuses(repositories, USER_A);
  });

  afterEach(async () => {
    await database.client.close();
  });

  async function storeIdOf(slug: string): Promise<string> {
    const stores = await repositories.stores.listAvailable(USER_A);
    return stores.find((store) => store.slug === slug)?.id ?? "";
  }

  it("Agregar con dos copias", async () => {
    const copies = [
      { storeId: await storeIdOf("epic-games"), kind: "free" as const, acquiredOn: null, familyOwner: null },
      { storeId: await storeIdOf("steam"), kind: "purchased" as const, acquiredOn: null, familyOwner: null },
    ];

    const { gameId } = await repositories.games.addIgdbGame(USER_A, igdbData(5, "Civilization VI"), {
      ...entry(statuses),
      copies,
    });

    const game = await repositories.games.findById(USER_A, gameId);
    expect(game?.status.name).toBe("Pendiente");
    expect(game?.copies.map(({ storeName, kind }) => `${storeName} ${kind}`).toSorted()).toEqual([
      "Epic Games free",
      "Steam purchased",
    ]);
  });

  it("si falla una de las copias no queda nada del juego", async () => {
    const copies = [
      { storeId: await storeIdOf("steam"), kind: "purchased" as const, acquiredOn: null, familyOwner: null },
      { storeId: MISSING_ID, kind: "free" as const, acquiredOn: null, familyOwner: null },
    ];

    const add = repositories.games.addManualGame(USER_A, MANUAL_DATA, { ...entry(statuses), copies });

    await expect(add).rejects.toThrow();
    expect(await repositories.games.listLibrary(USER_A)).toEqual([]);
  });

  it("Agregar con puntaje", async () => {
    const withScore = { ...entry(statuses), score: 9.5 };

    const { gameId } = await repositories.games.addIgdbGame(USER_A, igdbData(6, "Hades"), withScore);

    expect((await repositories.games.findById(USER_A, gameId))?.score).toBe(9.5);
  });

  it("Agregar sin tocar el puntaje", async () => {
    const withoutScore = entry(statuses);

    const gameId = await repositories.games.addManualGame(USER_A, MANUAL_DATA, withoutScore);

    expect((await repositories.games.findById(USER_A, gameId))?.score).toBeNull();
  });
});

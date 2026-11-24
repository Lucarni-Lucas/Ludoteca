import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createImportRepository, type ImportRepository } from "@/persistence/repository/import/import-repository";
import { importEntry } from "@/persistence/sql/import/import-entry";
import { importItem } from "@/persistence/sql/import/import-item";

import { createTestDatabase, type TestDatabase } from "../../pglite";
import { createRepositories, entry, igdbData, seedStatuses, steamOf } from "../game/game-fixtures";
import { USER_A, USER_B } from "../users";
import { matchedGame, newItem } from "./import-fixtures";

describe("createImportRepository", () => {
  let database: TestDatabase;
  let imports: ImportRepository;

  beforeEach(async () => {
    database = await createTestDatabase();
    imports = createImportRepository(database.db);
  });

  afterEach(async () => {
    await database.client.close();
  });

  async function itemIdOf(userId: string, sourceKey: string): Promise<string> {
    const [pending] = (await imports.listPendingItems(userId, 100)).filter((item) => item.sourceKey === sourceKey);
    return pending.id;
  }

  async function matchAll(userId: string, games: Readonly<Record<string, number>>): Promise<void> {
    const pending = await imports.listPendingItems(userId, 100);
    await imports.saveMatches(
      userId,
      pending.map((item) => ({
        itemId: item.id,
        kind: "matched" as const,
        game: matchedGame(games[item.sourceKey], item.title),
      })),
    );
  }

  describe("upsertItems", () => {
    it("guarda las filas nuevas como pendientes de cruzar", async () => {
      const items = [newItem("1"), newItem("2")];

      const result = await imports.upsertItems(USER_A, items);

      expect(result).toEqual({ inserted: 2, updated: 0 });
      expect((await imports.listPendingItems(USER_A, 10)).map((item) => item.sourceKey)).toEqual(["1", "2"]);
    });

    it("reimportar las mismas filas no duplica ni escribe nada", async () => {
      await imports.upsertItems(USER_A, [newItem("1"), newItem("2")]);

      const result = await imports.upsertItems(USER_A, [newItem("1"), newItem("2")]);

      expect(result).toEqual({ inserted: 0, updated: 0 });
      expect(await database.db.select().from(importItem)).toHaveLength(2);
    });

    it("una fila que cambió se actualiza sin perder su cruce ni sus decisiones", async () => {
      await imports.upsertItems(USER_A, [newItem("1")]);
      await matchAll(USER_A, { "1": 10 });
      const [entry] = (await imports.listOpenReview(USER_A)).entries;
      await imports.saveDecision(USER_A, [entry.id], { answers: { playAnswer: "not_interested" } });

      const result = await imports.upsertItems(USER_A, [newItem("1", { title: "Hades II", ignScore: 9 })]);

      const [reviewed] = (await imports.listOpenReview(USER_A)).entries;
      expect(result).toEqual({ inserted: 0, updated: 1 });
      expect(reviewed.items[0]).toMatchObject({ title: "Hades II", ignScore: 9, matchState: "matched" });
      expect(reviewed.answers.playAnswer).toBe("not_interested");
    });

    it("una fila confirmada no cambia", async () => {
      await imports.upsertItems(USER_A, [newItem("1", { title: "Hades" })]);
      await database.db.update(importItem).set({ confirmedAt: new Date() });

      const result = await imports.upsertItems(USER_A, [newItem("1", { title: "Otro nombre" })]);

      const [row] = await database.db.select().from(importItem);
      expect(result).toEqual({ inserted: 0, updated: 0 });
      expect(row.title).toBe("Hades");
    });

    it("la misma clave en otra fuente es otra fila", async () => {
      await imports.upsertItems(USER_A, [newItem("1145360")]);

      const result = await imports.upsertItems(USER_A, [newItem("1145360", { source: "steam" })]);

      expect(result.inserted).toBe(1);
    });
  });

  describe("saveMatches", () => {
    it("dos filas del mismo juego de IGDB caen en un solo juego a revisar", async () => {
      await imports.upsertItems(USER_A, [newItem("ign-1"), newItem("1145360", { source: "steam" })]);

      await matchAll(USER_A, { "ign-1": 77, "1145360": 77 });

      const review = await imports.listOpenReview(USER_A);
      expect(review.entries).toHaveLength(1);
      expect(review.entries[0].items).toHaveLength(2);
      expect(review.entries[0]).toMatchObject({ igdbId: 77, catalog: { title: "Juego ign-1" } });
      expect(review.pendingCount).toBe(0);
    });

    it("guarda los candidatos y las filas sin cruce, cada una en su propio juego a revisar", async () => {
      await imports.upsertItems(USER_A, [newItem("1"), newItem("2")]);
      const candidate = { igdbId: 5, baseIgdbId: 5, title: "Overwatch", year: 2016, coverUrl: null };

      await imports.saveMatches(USER_A, [
        { itemId: await itemIdOf(USER_A, "1"), kind: "candidates", candidates: [candidate] },
        { itemId: await itemIdOf(USER_A, "2"), kind: "not_found" },
      ]);

      const { entries } = await imports.listOpenReview(USER_A);
      const items = new Map(entries.map((entry) => [entry.items[0].sourceKey, entry.items[0]]));
      expect(items.get("1")).toMatchObject({ matchState: "candidates", candidates: [candidate] });
      expect(items.get("2")).toMatchObject({ matchState: "not_found", candidates: [] });
      expect(entries.map((entry) => entry.igdbId)).toEqual([null, null]);
    });

    it("una entrada que no es juego se cuelga del juego a revisar de su base", async () => {
      await imports.upsertItems(USER_A, [newItem("base"), newItem("beta")]);
      const baseId = await itemIdOf(USER_A, "base");
      const betaId = await itemIdOf(USER_A, "beta");

      await imports.saveMatches(USER_A, [
        { itemId: betaId, kind: "absorbed", baseItemId: baseId },
        { itemId: baseId, kind: "matched", game: matchedGame(3, "Barony") },
      ]);

      const { entries } = await imports.listOpenReview(USER_A);
      expect(entries).toHaveLength(1);
      expect(entries[0].items.map((item) => item.matchState).toSorted()).toEqual(["absorbed", "matched"]);
    });

    it("una entrada colgada de un juego de la biblioteca queda confirmada", async () => {
      await imports.upsertItems(USER_A, [newItem("soundtrack")]);

      await imports.saveMatches(USER_A, [
        { itemId: await itemIdOf(USER_A, "soundtrack"), kind: "absorbed", baseItemId: null },
      ]);

      const review = await imports.listOpenReview(USER_A);
      expect(review.itemCount).toBe(0);
    });

    it("una fila nueva de un juego ya confirmado vuelve a abrir su juego a revisar", async () => {
      await imports.upsertItems(USER_A, [newItem("ign-1")]);
      await matchAll(USER_A, { "ign-1": 77 });
      await database.db.update(importEntry).set({ confirmedAt: new Date() });
      await database.db.update(importItem).set({ confirmedAt: new Date() });
      await imports.upsertItems(USER_A, [newItem("1145360", { source: "steam" })]);

      await matchAll(USER_A, { "1145360": 77 });

      const { entries } = await imports.listOpenReview(USER_A);
      expect(entries).toHaveLength(1);
      expect(entries[0].items.map((item) => item.sourceKey)).toEqual(["1145360"]);
    });
  });

  describe("listOpenReview", () => {
    it("trae las copias que ya tiene en la biblioteca el juego cruzado", async () => {
      const repositories = createRepositories(database);
      const statuses = await seedStatuses(repositories, USER_A);
      const steam = await steamOf(repositories, USER_A);
      await repositories.games.addIgdbGame(USER_A, igdbData(77, "Hades"), {
        ...entry(statuses),
        copies: [{ storeId: steam.id, kind: "purchased", acquiredOn: null, familyOwner: null }],
      });
      await imports.upsertItems(USER_A, [newItem("ign-1")]);

      await matchAll(USER_A, { "ign-1": 77 });

      const { library, entries } = await imports.listOpenReview(USER_A);
      expect(library).toEqual([
        {
          catalogGameId: entries[0].catalogGameId,
          libraryGameId: expect.any(String),
          copies: [{ storeId: steam.id, storeGameId: null }],
        },
      ]);
    });

    it("cuenta las filas pendientes de cruzar", async () => {
      await imports.upsertItems(USER_A, [newItem("1"), newItem("2"), newItem("3")]);
      await imports.saveMatches(USER_A, [{ itemId: await itemIdOf(USER_A, "1"), kind: "not_found" }]);

      const review = await imports.listOpenReview(USER_A);

      expect(review).toMatchObject({ pendingCount: 2, itemCount: 3 });
    });
  });

  describe("saveDecision y clearDecision", () => {
    async function threeEntries(): Promise<readonly string[]> {
      const steam = await steamOf(createRepositories(database), USER_A);
      await imports.upsertItems(
        USER_A,
        ["1", "2", "3"].map((key) => newItem(key, { source: "playnite", storeId: steam.id, storeGameId: key })),
      );
      await matchAll(USER_A, { "1": 1, "2": 2, "3": 3 });
      return (await imports.listOpenReview(USER_A)).entries.map((entry) => entry.id);
    }

    it("una decisión en lote toca solo los ids pedidos", async () => {
      const [first, second, third] = await threeEntries();

      await imports.saveDecision(USER_A, [first, third], { answers: { playAnswer: "not_interested" } });

      const { entries } = await imports.listOpenReview(USER_A);
      const answers = new Map(entries.map((entry) => [entry.id, entry.answers.playAnswer]));
      expect([answers.get(first), answers.get(second), answers.get(third)]).toEqual(["not_interested", null, "not_interested"]);
    });

    it("el tipo de copia cambia solo las filas de esa tienda en los juegos pedidos", async () => {
      const [first, second] = await threeEntries();
      const steam = await steamOf(createRepositories(database), USER_A);

      await imports.saveDecision(USER_A, [second], { copies: { storeId: steam.id, copyKind: "family", excluded: false } });

      const { entries } = await imports.listOpenReview(USER_A);
      const kinds = new Map(entries.map((entry) => [entry.id, entry.items[0].copyKind]));
      expect([kinds.get(first), kinds.get(second)]).toEqual([null, "family"]);
    });

    it("«Volver a revisar» borra las respuestas del juego y de sus copias", async () => {
      const [first] = await threeEntries();
      const steam = await steamOf(createRepositories(database), USER_A);
      await imports.saveDecision(USER_A, [first], {
        answers: { statusKey: "completed", endlessAnswer: true, excluded: true },
        copies: { storeId: steam.id, copyKind: "purchased", excluded: true },
      });

      await imports.clearDecision(USER_A, [first]);

      const entry = (await imports.listOpenReview(USER_A)).entries.find(({ id }) => id === first);
      expect(entry?.answers).toEqual({ statusKey: null, endlessAnswer: null, playAnswer: null, excluded: false, manualTitle: null });
      expect(entry?.items[0]).toMatchObject({ copyKind: null, excluded: false });
    });
  });

  describe("aislamiento", () => {
    it("el usuario A no ve ni cambia nada del B", async () => {
      await imports.upsertItems(USER_A, [newItem("1", { title: "Hades" })]);
      await matchAll(USER_A, { "1": 77 });
      const [entryA] = (await imports.listOpenReview(USER_A)).entries;
      const itemA = entryA.items[0];

      const pendingOfB = await imports.listPendingItems(USER_B, 10);
      const reviewOfB = await imports.listOpenReview(USER_B);
      await imports.saveDecision(USER_B, [entryA.id], { answers: { excluded: true } });
      await imports.clearDecision(USER_B, [entryA.id]);
      await imports.saveMatches(USER_B, [{ itemId: itemA.id, kind: "not_found" }]);
      await imports.upsertItems(USER_B, [newItem("1", { title: "Otro" })]);

      expect(pendingOfB).toEqual([]);
      expect(reviewOfB.entries).toEqual([]);
      const [entryAfter] = (await imports.listOpenReview(USER_A)).entries;
      expect(entryAfter.answers.excluded).toBe(false);
      expect(entryAfter.items[0]).toMatchObject({ title: "Hades", matchState: "matched", entryId: entryA.id });
      const itemsOfB = await database.db.select().from(importItem).where(eq(importItem.userId, USER_B));
      expect(itemsOfB.map((item) => item.title)).toEqual(["Otro"]);
    });
  });
});

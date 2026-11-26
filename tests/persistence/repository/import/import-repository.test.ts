import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ImportCandidate, OpenReview } from "@/model/import/import-entry";
import { buildReview } from "@/model/import/review";
import { createImportRepository, type ImportRepository } from "@/persistence/repository/import/import-repository";
import { importEntry } from "@/persistence/sql/import/import-entry";
import { importItem } from "@/persistence/sql/import/import-item";
import { status } from "@/persistence/sql/status/status";

import { createTestDatabase, type TestDatabase } from "../../pglite";
import { createRepositories, entry, igdbData, seedStatuses, steamOf } from "../game/game-fixtures";
import { USER_A, USER_B } from "../users";
import { STATUSES } from "../../../model/import/import-fixtures";
import { matchedGame, newItem } from "./import-fixtures";

function candidate(igdbId: number, title: string, year: number): ImportCandidate {
  return { igdbId, baseIgdbId: igdbId, title, year, coverUrl: null };
}

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
      await imports.saveDecision(USER_A, [entry.id], { answers: { playAnswer: "hidden" } });

      const result = await imports.upsertItems(USER_A, [newItem("1", { title: "Hades II", ignScore: 9 })]);

      const [reviewed] = (await imports.listOpenReview(USER_A)).entries;
      expect(result).toEqual({ inserted: 0, updated: 1 });
      expect(reviewed.items[0]).toMatchObject({ title: "Hades II", ignScore: 9, matchState: "matched" });
      expect(reviewed.answers.playAnswer).toBe("hidden");
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

    it("Demo sin su juego: su juego a revisar nace en «No importar»", async () => {
      await imports.upsertItems(USER_A, [newItem("demo", { title: "Cuphead Demo" }), newItem("viejo")]);

      await imports.saveMatches(USER_A, [
        { itemId: await itemIdOf(USER_A, "demo"), kind: "not_found", notAGame: true },
        { itemId: await itemIdOf(USER_A, "viejo"), kind: "not_found" },
      ]);

      const { entries } = await imports.listOpenReview(USER_A);
      const excluded = new Map(entries.map((entry) => [entry.items[0].sourceKey, entry.answers.excluded]));
      expect(Object.fromEntries(excluded)).toEqual({ demo: true, viejo: false });
      expect(entries.find((entry) => entry.answers.excluded)?.items[0]).toMatchObject({ matchState: "not_found" });
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

      await imports.saveDecision(USER_A, [first, third], { answers: { playAnswer: "hidden" } });

      const { entries } = await imports.listOpenReview(USER_A);
      const answers = new Map(entries.map((entry) => [entry.id, entry.answers.playAnswer]));
      expect([answers.get(first), answers.get(second), answers.get(third)]).toEqual(["hidden", null, "hidden"]);
    });

    it("el tipo de copia cambia solo las filas de esa tienda en los juegos pedidos", async () => {
      const [first, second] = await threeEntries();
      const steam = await steamOf(createRepositories(database), USER_A);

      await imports.saveDecision(USER_A, [second], { copies: { storeId: steam.id, copyKind: "family", excluded: false } });

      const { entries } = await imports.listOpenReview(USER_A);
      const kinds = new Map(entries.map((entry) => [entry.id, entry.items[0].copyKind]));
      expect([kinds.get(first), kinds.get(second)]).toEqual([null, "family"]);
    });

    it("una respuesta con un estado que se borra queda vacía", async () => {
      const [first] = await threeEntries();
      const [chosen] = await seedStatuses(createRepositories(database), USER_A);
      await imports.saveDecision(USER_A, [first], { answers: { statusId: chosen.id } });

      await database.db.delete(status).where(eq(status.id, chosen.id));

      const entry = (await imports.listOpenReview(USER_A)).entries.find(({ id }) => id === first);
      expect(entry?.answers.statusId).toBeNull();
    });

    it("una respuesta con un estado no cambia los juegos de otro usuario", async () => {
      const [first] = await threeEntries();
      const [chosen] = await seedStatuses(createRepositories(database), USER_A);

      await imports.saveDecision(USER_B, [first], { answers: { statusId: chosen.id } });

      const entry = (await imports.listOpenReview(USER_A)).entries.find(({ id }) => id === first);
      expect(entry?.answers.statusId).toBeNull();
    });

    it("«Volver a revisar» borra las respuestas del juego y de sus copias", async () => {
      const [first] = await threeEntries();
      const repositories = createRepositories(database);
      const steam = await steamOf(repositories, USER_A);
      const [status] = await seedStatuses(repositories, USER_A);
      await imports.saveDecision(USER_A, [first], {
        answers: { statusId: status.id, endlessAnswer: true, excluded: true },
        copies: { storeId: steam.id, copyKind: "purchased", excluded: true },
      });

      await imports.clearDecision(USER_A, [first]);

      const entry = (await imports.listOpenReview(USER_A)).entries.find(({ id }) => id === first);
      expect(entry?.answers).toEqual({ statusId: null, endlessAnswer: null, playAnswer: null, excluded: false, manualTitle: null });
      expect(entry?.items[0]).toMatchObject({ copyKind: null, excluded: false });
    });
  });

  describe("matchEntry y «Volver a revisar»", () => {
    const beholder = [candidate(501, "Beholder", 2016), candidate(502, "Beholder 2", 2018)];

    async function chooseCandidate(): Promise<string> {
      await imports.upsertItems(USER_A, [newItem("beholder", { title: "Beholder", year: 2016 })]);
      await imports.saveMatches(USER_A, [{ itemId: await itemIdOf(USER_A, "beholder"), kind: "candidates", candidates: beholder }]);
      const [open] = (await imports.listOpenReview(USER_A)).entries;
      await imports.matchEntry(USER_A, open.id, matchedGame(501, "Beholder"), beholder[0]);
      const [chosen] = (await imports.listOpenReview(USER_A)).entries;
      return chosen.id;
    }

    function groupOfOnlyGame(review: OpenReview): string | undefined {
      return buildReview(review, { steamConnected: false, statuses: STATUSES }).groups.find((view) => view.games.length > 0)?.group;
    }

    it("elegir un candidato guarda la elección sin pisar el cruce", async () => {
      const entryId = await chooseCandidate();

      const { entries } = await imports.listOpenReview(USER_A);

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ id: entryId, igdbId: 501 });
      expect(entries[0].items[0]).toMatchObject({ matchState: "candidates", candidates: beholder, chosenIgdbId: 501 });
    });

    it("Volver después de elegir un candidato", async () => {
      const entryId = await chooseCandidate();

      await imports.clearDecision(USER_A, [entryId]);

      const review = await imports.listOpenReview(USER_A);
      expect(review.entries).toHaveLength(1);
      expect(review.entries[0]).toMatchObject({ igdbId: null, catalogGameId: null });
      expect(review.entries[0].items[0]).toMatchObject({ matchState: "candidates", candidates: beholder, chosenIgdbId: null });
      expect(groupOfOnlyGame(review)).not.toBe("ready");
    });

    it("volver desde el grupo al que pasó después de elegir lo deja en «¿Cuál de estos es?»", async () => {
      const entryId = await chooseCandidate();
      const before = groupOfOnlyGame(await imports.listOpenReview(USER_A));

      await imports.clearDecision(USER_A, [entryId]);

      const review = await imports.listOpenReview(USER_A);
      expect(before).not.toBe("which");
      expect(groupOfOnlyGame(review)).toBe("which");
      expect(review.entries[0].items[0]).toMatchObject({ chosenIgdbId: null });
    });

    it("lo elegido con «Buscar con otro nombre» vuelve a «No lo encontré»", async () => {
      await imports.upsertItems(USER_A, [newItem("viejo", { title: "Juego Viejo" })]);
      await imports.saveMatches(USER_A, [{ itemId: await itemIdOf(USER_A, "viejo"), kind: "not_found" }]);
      const [open] = (await imports.listOpenReview(USER_A)).entries;
      await imports.matchEntry(USER_A, open.id, matchedGame(600, "Juego Viejo Remasterizado"), candidate(600, "Juego Viejo Remasterizado", 2004));
      const [chosen] = (await imports.listOpenReview(USER_A)).entries;

      await imports.clearDecision(USER_A, [chosen.id]);

      const review = await imports.listOpenReview(USER_A);
      expect(review.entries[0].items[0]).toMatchObject({ matchState: "not_found", chosenIgdbId: null });
      expect(groupOfOnlyGame(review)).toBe("not_found");
    });

    it("al volver, una fila elegida deja el juego al que se había sumado y las demás quedan ahí", async () => {
      await imports.upsertItems(USER_A, [newItem("hades-ign", { title: "Hades" }), newItem("hades-otro", { title: "Hádes" })]);
      await imports.saveMatches(USER_A, [
        { itemId: await itemIdOf(USER_A, "hades-ign"), kind: "matched", game: matchedGame(77, "Hades") },
        { itemId: await itemIdOf(USER_A, "hades-otro"), kind: "candidates", candidates: [candidate(77, "Hades", 2020)] },
      ]);
      const own = (await imports.listOpenReview(USER_A)).entries.find((open) => open.igdbId === null);
      await imports.matchEntry(USER_A, own?.id ?? "", matchedGame(77, "Hades"), candidate(77, "Hades", 2020));
      const [joined] = (await imports.listOpenReview(USER_A)).entries;

      await imports.clearDecision(USER_A, [joined.id]);

      const { entries } = await imports.listOpenReview(USER_A);
      const byKey = new Map(entries.flatMap((open) => open.items.map((item) => [item.sourceKey, open] as const)));
      expect(entries).toHaveLength(2);
      expect(byKey.get("hades-ign")).toMatchObject({ id: joined.id, igdbId: 77 });
      expect(byKey.get("hades-otro")).toMatchObject({ igdbId: null });
    });
  });

  describe("mismo nombre desde varias fuentes", () => {
    const fortnites = [candidate(1, "Fortnite", 2017), candidate(2, "Fortnite", 2018)];

    async function fortniteOfIgnAndEpic(): Promise<readonly [string, string]> {
      await imports.upsertItems(USER_A, [
        newItem("fortnite-ign", { title: "Fortnite", year: 2017, ignScore: 8 }),
        newItem("epic:Fortnite", { source: "playnite", title: "Fortnite", year: 2020, playtimeMinutes: 7200 }),
      ]);
      return [await itemIdOf(USER_A, "fortnite-ign"), await itemIdOf(USER_A, "epic:Fortnite")];
    }

    it("Fortnite de IGN y de Epic", async () => {
      const [ign, epic] = await fortniteOfIgnAndEpic();

      await imports.saveMatches(USER_A, [
        { itemId: ign, kind: "candidates", candidates: fortnites },
        { itemId: epic, kind: "candidates", candidates: fortnites, joinItemId: ign },
      ]);

      const { entries } = await imports.listOpenReview(USER_A);
      expect(entries).toHaveLength(1);
      expect(entries[0].items.map((value) => value.sourceKey).toSorted()).toEqual(["epic:Fortnite", "fortnite-ign"]);
      const [game] = buildReview(await imports.listOpenReview(USER_A), { steamConnected: false, statuses: STATUSES }).groups[0].games;
      expect(game.origins).toHaveLength(2);
    });

    it("una fila de otra tanda se suma al juego a revisar que espera", async () => {
      const [ign, epic] = await fortniteOfIgnAndEpic();
      await imports.saveMatches(USER_A, [{ itemId: ign, kind: "not_found" }]);
      const [waiting] = (await imports.listOpenReview(USER_A)).entries;

      await imports.saveMatches(USER_A, [{ itemId: epic, kind: "not_found", joinEntryId: waiting.id }]);

      const { entries } = await imports.listOpenReview(USER_A);
      expect(entries.map((value) => [value.id, value.items.length])).toEqual([[waiting.id, 2]]);
    });

    it("Mismo nombre sin encontrar: «No importar» deja afuera a los dos", async () => {
      const [ign, epic] = await fortniteOfIgnAndEpic();
      await imports.saveMatches(USER_A, [
        { itemId: ign, kind: "not_found" },
        { itemId: epic, kind: "not_found", joinItemId: ign },
      ]);
      const [waiting] = (await imports.listOpenReview(USER_A)).entries;

      await imports.saveDecision(USER_A, [waiting.id], { answers: { excluded: true } });

      const review = buildReview(await imports.listOpenReview(USER_A), { steamConnected: false, statuses: STATUSES });
      expect(review.excluded).toBe(1);
      const games = review.groups.flatMap((group) => group.games);
      expect(games).toHaveLength(1);
      expect(games[0]).toMatchObject({ group: "ready", excluded: true });
      expect(games[0].origins).toHaveLength(2);
    });

    it("«Volver a revisar» después de elegir deja a Fortnite como una sola pregunta", async () => {
      const [ign, epic] = await fortniteOfIgnAndEpic();
      await imports.saveMatches(USER_A, [
        { itemId: ign, kind: "candidates", candidates: fortnites },
        { itemId: epic, kind: "candidates", candidates: fortnites, joinItemId: ign },
      ]);
      const [waiting] = (await imports.listOpenReview(USER_A)).entries;
      await imports.matchEntry(USER_A, waiting.id, matchedGame(1, "Fortnite"), fortnites[0]);
      const [chosen] = (await imports.listOpenReview(USER_A)).entries;

      await imports.clearDecision(USER_A, [chosen.id]);

      const { entries } = await imports.listOpenReview(USER_A);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ igdbId: null });
      expect(entries[0].items.map((value) => value.chosenIgdbId)).toEqual([null, null]);
    });

    it("el usuario A no ve ni cambia nada del B al juntar el mismo nombre", async () => {
      await imports.upsertItems(USER_A, [newItem("fortnite-ign", { title: "Fortnite" })]);
      await imports.saveMatches(USER_A, [{ itemId: await itemIdOf(USER_A, "fortnite-ign"), kind: "not_found" }]);
      const [entryOfA] = (await imports.listOpenReview(USER_A)).entries;
      await imports.upsertItems(USER_B, [newItem("epic:Fortnite", { source: "playnite", title: "Fortnite" })]);

      await imports.saveMatches(USER_B, [{ itemId: await itemIdOf(USER_B, "epic:Fortnite"), kind: "not_found", joinEntryId: entryOfA.id }]);

      const [afterOfA] = (await imports.listOpenReview(USER_A)).entries;
      expect(afterOfA.items).toHaveLength(1);
      const [entryOfB] = (await imports.listOpenReview(USER_B)).entries;
      expect(entryOfB.id).not.toBe(entryOfA.id);
      expect(entryOfB.items.map((value) => value.sourceKey)).toEqual(["epic:Fortnite"]);
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

    it("el usuario A no ve ni cambia nada del B al guardar lo que no es un juego", async () => {
      await imports.upsertItems(USER_A, [newItem("demo", { title: "Cuphead Demo" })]);
      const demoOfA = await itemIdOf(USER_A, "demo");

      await imports.saveMatches(USER_B, [{ itemId: demoOfA, kind: "not_found", notAGame: true }]);

      expect(await imports.listPendingItems(USER_A, 10)).toEqual([expect.objectContaining({ id: demoOfA, entryId: null })]);
      expect((await imports.listOpenReview(USER_B)).entries).toEqual([]);
    });

    it("el usuario A no ve ni cambia nada del B al volver a revisar", async () => {
      const crash = [candidate(1, "Crash Bandicoot", 1996), candidate(2, "Crash Bandicoot", 2004)];
      await imports.upsertItems(USER_A, [newItem("crash", { title: "Crash Bandicoot" })]);
      await imports.saveMatches(USER_A, [{ itemId: await itemIdOf(USER_A, "crash"), kind: "candidates", candidates: crash }]);
      const [open] = (await imports.listOpenReview(USER_A)).entries;
      await imports.matchEntry(USER_A, open.id, matchedGame(1, "Crash Bandicoot"), crash[0]);
      const [chosenOfA] = (await imports.listOpenReview(USER_A)).entries;

      await imports.clearDecision(USER_B, [chosenOfA.id]);
      await imports.matchEntry(USER_B, chosenOfA.id, matchedGame(2, "Crash Bandicoot"), crash[1]);

      const [after] = (await imports.listOpenReview(USER_A)).entries;
      expect(after).toMatchObject({ id: chosenOfA.id, igdbId: 1 });
      expect(after.items[0]).toMatchObject({ chosenIgdbId: 1, entryId: chosenOfA.id });
      expect(await database.db.select().from(importEntry).where(eq(importEntry.userId, USER_B))).toEqual([]);
    });
  });
});

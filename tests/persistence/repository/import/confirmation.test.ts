import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readIgnExport } from "@/adapter/ign/ign-adapter";
import { readPlayniteExport } from "@/adapter/playnite/playnite-adapter";
import { gamesInGroup } from "@/model/import/review";
import { createImportRepository, type ImportRepository } from "@/persistence/repository/import/import-repository";
import { createStoreConnectionRepository } from "@/persistence/repository/store/store-connection-repository";
import { journalEntry } from "@/persistence/sql/journal/journal-entry";
import { status } from "@/persistence/sql/status/status";
import { createStoreResolver } from "@/service/copy/store-resolver";
import { createImportService, type ImportService } from "@/service/import/import-service";
import { createStatusService } from "@/service/status/status-service";

import { createFakeIgdb, createFakeSteam, matchedGame, searchResult } from "../../../service/import/fakes";
import { createTestDatabase, type TestDatabase } from "../../pglite";
import { createRepositories, igdbData, type Repositories, seedStatuses, steamOf } from "../game/game-fixtures";
import { MISSING_ID, USER_A, USER_B } from "../users";
import { newItem } from "./import-fixtures";

const TODAY = "2026-11-23";
const IGN_SAMPLE = readFileSync(path.resolve("tests/adapter/ign/ign-export-sample.json"), "utf8");

/** El servicio con los repositorios reales sobre PGlite y un IGDB falso que conoce los juegos de la muestra. */
function createService(database: TestDatabase, repositories: Repositories): ImportService {
  const games = new Map([
    [199748, matchedGame(199748, "20 Minutes Till Dawn", { year: 2022 })],
    [368360, matchedGame(368360, "60 Seconds!", { year: 2015, estimatedHours: null })],
    [250420, matchedGame(250420, "8BitMMO", { year: 2001 })],
    [945360, matchedGame(945360, "Among Us", { year: 2018, multiplayerOnly: true })],
    [504230, matchedGame(504230, "Celeste", { year: 2018 })],
  ]);
  const igdb = createFakeIgdb({
    externalIds: new Map([...games.keys()].map((id) => [`steam:${id === 199748 ? 1966900 : id}`, id])),
    titles: new Map([["Overwatch", [searchResult(1, "Overwatch", 2016), searchResult(2, "Overwatch 2", 2022)]]]),
    games,
  });

  return createImportService({
    importRepo: createImportRepository(database.db),
    fileReaders: [readIgnExport, readPlayniteExport],
    igdb,
    steam: createFakeSteam(),
    connections: createStoreConnectionRepository(database.db),
    stores: repositories.stores,
    storeResolver: createStoreResolver(repositories.stores),
    statusService: createStatusService({ statusRepo: repositories.statuses }),
    clock: { today: () => TODAY },
  });
}

async function countRows(database: TestDatabase, table: typeof journalEntry | typeof status): Promise<number> {
  const [{ count }] = await database.db.select({ count: sql<number>`count(*)::int` }).from(table);
  return count;
}

describe("importación contra la base", () => {
  let database: TestDatabase;
  let repositories: Repositories;
  let imports: ImportRepository;
  let service: ImportService;

  beforeEach(async () => {
    database = await createTestDatabase();
    repositories = createRepositories(database);
    imports = createImportRepository(database.db);
    service = createService(database, repositories);
  });

  afterEach(async () => {
    await database.client.close();
  });

  async function loadAndMatch(userId = USER_A) {
    await service.loadFile(userId, IGN_SAMPLE);
    await service.advanceMatching(userId);
  }

  it("Retomar la revisión", async () => {
    await loadAndMatch();
    const [amongUs] = gamesInGroup((await service.getOverview(USER_A)).review, "endless");
    await service.decide(USER_A, [amongUs.entryId], { kind: "choose", choice: { kind: "completed" } });

    // Al día siguiente: otra instancia del servicio, la misma base.
    const later = await createService(database, repositories).getOverview(USER_A);

    const readyTitles = gamesInGroup(later.review, "ready").map((game) => game.title);
    expect(readyTitles).toContain("Among Us");
    expect(gamesInGroup(later.review, "endless")).toEqual([]);
    expect(gamesInGroup(later.review, "review").map((game) => game.title)).toEqual(["Overwatch"]);
    expect(await repositories.games.listLibrary(USER_A)).toEqual([]);
  });

  it("la confirmación entra a la biblioteca con lo marcado, crea los estados de fábrica y no escribe el diario", async () => {
    await loadAndMatch();

    const summary = await service.confirm(USER_A);

    const library = await repositories.games.listLibrary(USER_A);
    const byTitle = new Map(library.map((game) => [game.title, game]));
    expect(await countRows(database, status)).toBe(10);
    expect(await countRows(database, journalEntry)).toBe(0);
    expect(byTitle.get("20 Minutes Till Dawn")).toMatchObject({ score: 5, status: { systemKey: "abandoned" } });
    expect(byTitle.get("60 Seconds!")).toMatchObject({ hltbHours: 2.3, status: { systemKey: "completed" } });
    expect(byTitle.has("Overwatch")).toBe(false);
    expect(summary.games).toBe(library.length);
  });

  it("la confirmación entra entera o no entra", async () => {
    await loadAndMatch();
    const open = await imports.listOpenReview(USER_A);
    const statuses = await seedStatuses(repositories, USER_A);
    const [first, second] = open.entries.filter((value) => value.catalogGameId !== null);
    const values = { statusId: statuses[0].id, statusSince: TODAY, score: null, notInterested: false, endless: null, hltbHours: null };
    const broken = {
      games: [
        { entryId: first.id, target: { kind: "igdb" as const, catalogGameId: first.catalogGameId ?? "", values }, copies: [] },
        // Un estado que no existe hace fallar el segundo insert.
        { entryId: second.id, target: { kind: "manual" as const, title: "Roto", year: null, values: { ...values, statusId: MISSING_ID } }, copies: [] },
      ],
      entryIds: [first.id, second.id],
      summary: { games: 2, copies: 0, notInterested: 0, excluded: 0 },
    };

    const apply = imports.applyConfirmation(USER_A, broken);

    await expect(apply).rejects.toThrow();
    expect(await repositories.games.listLibrary(USER_A)).toEqual([]);
    expect((await imports.listOpenReview(USER_A)).entries).toHaveLength(open.entries.length);
  });

  it("Segunda importación: reimportar el mismo archivo después de confirmar no suma nada", async () => {
    await loadAndMatch();
    await service.confirm(USER_A);
    const before = await repositories.games.listLibrary(USER_A);

    await loadAndMatch();
    const summary = await service.confirm(USER_A);

    expect(summary).toMatchObject({ games: 0, copies: 0 });
    expect(await repositories.games.listLibrary(USER_A)).toHaveLength(before.length);
  });

  it("Juego ya puntuado: un juego que ya estaba conserva su puntaje y su estado", async () => {
    const statuses = await seedStatuses(repositories, USER_A);
    const playing = statuses.find((value) => value.systemKey === "playing");
    await repositories.games.addIgdbGame(USER_A, igdbData(504230, "Celeste"), {
      statusId: playing?.id ?? "",
      statusSince: "2026-01-01",
      copies: [],
      score: 9.6,
    });
    await loadAndMatch();

    await service.confirm(USER_A);

    const celeste = (await repositories.games.listLibrary(USER_A)).find((game) => game.title === "Celeste");
    expect(celeste).toMatchObject({ score: 9.6, statusSince: "2026-01-01", status: { systemKey: "playing" } });
  });

  it("elegir un candidato muda las filas al juego a revisar que ya existía para ese juego", async () => {
    await imports.upsertItems(USER_A, [newItem("a", { title: "Hades" }), newItem("b", { title: "Hades II", source: "steam" })]);
    const [a, b] = await imports.listPendingItems(USER_A, 10);
    const candidate = searchResult(77, "Hades");
    await imports.saveMatches(USER_A, [
      { itemId: a.id, kind: "matched", game: matchedGame(77, "Hades") },
      { itemId: b.id, kind: "candidates", candidates: [candidate] },
    ]);
    const orphan = (await imports.listOpenReview(USER_A)).entries.find((value) => value.igdbId === null);

    await imports.matchEntry(USER_A, orphan?.id ?? "", matchedGame(77, "Hades"), candidate);

    const { entries } = await imports.listOpenReview(USER_A);
    expect(entries).toHaveLength(1);
    expect(entries[0].items.map((value) => value.matchState)).toEqual(["matched", "matched"]);
  });

  it("resume las fuentes leídas y lista los títulos de la biblioteca con sus tiendas", async () => {
    await seedStatuses(repositories, USER_A);
    const steam = await steamOf(repositories, USER_A);
    const statuses = await repositories.statuses.listByUser(USER_A);
    await repositories.games.addIgdbGame(USER_A, igdbData(1, "Q.U.B.E. 2"), {
      statusId: statuses[0].id,
      statusSince: TODAY,
      copies: [{ storeId: steam.id, kind: "purchased", acquiredOn: null, familyOwner: null }],
      score: null,
    });
    await service.loadFile(USER_A, IGN_SAMPLE);

    const [sources, titles] = await Promise.all([imports.summarizeSources(USER_A), imports.listLibraryTitles(USER_A)]);

    expect(sources).toEqual([{ source: "ign", itemCount: 9, lastReadAt: expect.any(String) }]);
    expect(titles).toEqual([{ title: "Q.U.B.E. 2", storeIds: [steam.id] }]);
  });

  it("el usuario A no ve ni cambia nada del B al confirmar", async () => {
    await loadAndMatch(USER_A);

    const summaryOfB = await service.confirm(USER_B);

    expect(summaryOfB).toEqual({ games: 0, copies: 0, notInterested: 0, excluded: 0 });
    expect(await repositories.games.listLibrary(USER_B)).toEqual([]);
    expect((await imports.listOpenReview(USER_A)).entries.length).toBeGreaterThan(0);
    expect(await imports.summarizeSources(USER_B)).toEqual([]);
    expect(await imports.listLibraryTitles(USER_B)).toEqual([]);
  });
});

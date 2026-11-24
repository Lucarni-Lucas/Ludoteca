import { describe, expect, it } from "vitest";

import { IgdbUnavailableError } from "@/adapter/igdb/errors";

import { entry, EPIC, GOG, ignItem, item, openReview, playniteItem, STEAM, steamItem } from "../../model/import/import-fixtures";
import { createFakeIgdb, createFakeImportRepo, matchedGame, searchResult, setup, USER_ID } from "./fakes";

const pending = { matchState: "pending" as const };

describe("advanceMatching", () => {
  it("Cruce por ID de Steam", async () => {
    const importRepo = createFakeImportRepo();
    importRepo.state.pending = [ignItem("20 Minutes Till Dawn", { ...pending, steamAppId: "1966900" })];
    const igdb = createFakeIgdb({
      externalIds: new Map([["steam:1966900", 199748]]),
      games: new Map([[199748, matchedGame(199748, "20 Minutes Till Dawn")]]),
    });
    const { service } = setup({ importRepo, igdb });

    await service.advanceMatching(USER_ID);

    expect(importRepo.state.matches).toEqual([
      { itemId: importRepo.state.pending[0].id, kind: "matched", game: expect.objectContaining({ igdbId: 199748 }) },
    ]);
    expect(igdb.searchMany).not.toHaveBeenCalled();
  });

  it("cruza por ID las filas de Steam y de GOG, y por título las de Epic", async () => {
    const importRepo = createFakeImportRepo();
    const [steam, gog, epic] = [
      steamItem("Hades", "1145360", 100, pending),
      playniteItem("Q.U.B.E. 2", GOG, "1199381642", pending),
      playniteItem("Rocket League", EPIC, "Sugar", { ...pending, year: 2015 }),
    ];
    importRepo.state.pending = [steam, gog, epic];
    const igdb = createFakeIgdb({
      externalIds: new Map([
        ["steam:1145360", 1],
        ["gog:1199381642", 2],
      ]),
      titles: new Map([["Rocket League", [searchResult(3, "Rocket League", 2015)]]]),
      games: new Map([1, 2, 3].map((id) => [id, matchedGame(id, `Juego ${id}`)])),
    });
    const { service } = setup({ importRepo, igdb });

    await service.advanceMatching(USER_ID);

    expect(igdb.searchMany).toHaveBeenCalledWith(["Rocket League"]);
    const matched = new Map(importRepo.state.matches.map((match) => [match.itemId, match.kind === "matched" ? match.game.igdbId : null]));
    expect([matched.get(steam.id), matched.get(gog.id), matched.get(epic.id)]).toEqual([1, 2, 3]);
  });

  it("Título ambiguo", async () => {
    const importRepo = createFakeImportRepo();
    importRepo.state.pending = [ignItem("Crash Bandicoot", { ...pending, year: 1996 })];
    const candidates = [searchResult(1, "Crash Bandicoot", 1996), searchResult(2, "Crash Bandicoot", 2004)];
    const { service } = setup({ importRepo, igdb: createFakeIgdb({ titles: new Map([["Crash Bandicoot", candidates]]) }) });

    await service.advanceMatching(USER_ID);

    expect(importRepo.state.matches).toEqual([{ itemId: importRepo.state.pending[0].id, kind: "candidates", candidates }]);
  });

  it("una tanda con 130 filas pendientes procesa 60 y deja 70", async () => {
    const importRepo = createFakeImportRepo();
    importRepo.state.pending = Array.from({ length: 130 }, (_, index) => steamItem(`Juego ${index}`, String(index), 0, pending));
    importRepo.state.review = { entries: [], library: [], pendingCount: 70, itemCount: 130 };
    const igdb = createFakeIgdb({
      externalIds: new Map(Array.from({ length: 130 }, (_, index) => [`steam:${index}`, index + 1])),
      games: new Map(Array.from({ length: 130 }, (_, index) => [index + 1, matchedGame(index + 1, `Juego ${index}`)])),
    });
    const { service } = setup({ importRepo, igdb });

    const progress = await service.advanceMatching(USER_ID);

    expect(importRepo.listPendingItems).toHaveBeenCalledWith(USER_ID, 60);
    expect(importRepo.state.matches).toHaveLength(60);
    expect(progress).toEqual({ done: 60, total: 130 });
  });

  it("busca por título hasta 30 filas por tanda y deja el resto pendiente", async () => {
    const importRepo = createFakeImportRepo();
    importRepo.state.pending = Array.from({ length: 40 }, (_, index) => playniteItem(`Juego ${index}`, EPIC, `e${index}`, pending));
    const igdb = createFakeIgdb();
    const { service } = setup({ importRepo, igdb });

    await service.advanceMatching(USER_ID);

    expect(igdb.searchMany.mock.calls[0][0]).toHaveLength(30);
    expect(importRepo.state.matches).toHaveLength(30);
  });

  it("Barony (Beta) cuelga de Barony", async () => {
    const importRepo = createFakeImportRepo();
    const base = playniteItem("Barony", EPIC, "barony", pending);
    const beta = playniteItem("Barony (Beta)", EPIC, "beta", pending);
    importRepo.state.pending = [beta, base];
    const igdb = createFakeIgdb({
      titles: new Map([["Barony", [searchResult(9, "Barony", 2020)]]]),
      games: new Map([[9, matchedGame(9, "Barony")]]),
    });
    const { service } = setup({ importRepo, igdb });

    await service.advanceMatching(USER_ID);

    expect(igdb.searchMany).toHaveBeenCalledWith(["Barony"]);
    expect(importRepo.state.matches).toContainEqual({ itemId: beta.id, kind: "absorbed", baseItemId: base.id });
  });

  it("una entrada que no es juego trae a su base pendiente a la tanda", async () => {
    const importRepo = createFakeImportRepo();
    const base = playniteItem("Barony", EPIC, "barony", pending);
    const beta = playniteItem("Barony (Beta)", EPIC, "beta", pending);
    importRepo.state.pending = [beta];
    importRepo.state.open = [beta, base];
    const igdb = createFakeIgdb({ titles: new Map([["Barony", [searchResult(9, "Barony", 2020)]]]), games: new Map([[9, matchedGame(9, "Barony")]]) });
    const { service } = setup({ importRepo, igdb });

    await service.advanceMatching(USER_ID);

    expect(importRepo.state.matches.map((match) => [match.itemId, match.kind])).toEqual([
      [base.id, "matched"],
      [beta.id, "absorbed"],
    ]);
  });

  it("un soundtrack sin base en la revisión cuelga de un juego de la biblioteca con copia de esa tienda", async () => {
    const importRepo = createFakeImportRepo();
    const soundtrack = playniteItem("Q.U.B.E. 2 Soundtrack", EPIC, "ost", pending);
    importRepo.state.pending = [soundtrack];
    importRepo.state.libraryTitles = [{ title: "Q.U.B.E. 2", storeIds: [EPIC.id] }];
    const { service, igdb } = setup({ importRepo });

    await service.advanceMatching(USER_ID);

    expect(importRepo.state.matches).toEqual([{ itemId: soundtrack.id, kind: "absorbed", baseItemId: null }]);
    expect(igdb.searchMany).not.toHaveBeenCalled();
  });

  it("«Cuphead Demo» y «Ubisoft Connect Services» quedan sin importar y sin buscar en IGDB", async () => {
    const importRepo = createFakeImportRepo();
    importRepo.state.pending = [
      playniteItem("Cuphead Demo", EPIC, "x", pending),
      playniteItem("Ubisoft Connect Services", STEAM, "y", pending),
    ];
    const { service, igdb } = setup({ importRepo });

    await service.advanceMatching(USER_ID);

    expect(importRepo.state.matches.map((match) => match.kind)).toEqual(["not_found", "not_found"]);
    expect(importRepo.state.matches.every((match) => match.kind === "not_found" && match.notAGame)).toBe(true);
    expect(igdb.searchMany).not.toHaveBeenCalled();
  });

  it("Demo sin su juego", async () => {
    const importRepo = createFakeImportRepo();
    const demo = playniteItem("Cuphead Demo", STEAM, "268910", pending);
    importRepo.state.pending = [demo];
    importRepo.state.open = [demo];
    const { service, igdb } = setup({ importRepo });

    await service.advanceMatching(USER_ID);

    expect(importRepo.state.matches).toEqual([{ itemId: demo.id, kind: "not_found", notAGame: true }]);
    expect(igdb.findByExternalIds).not.toHaveBeenCalled();
  });

  it("Beta con su juego", async () => {
    const importRepo = createFakeImportRepo();
    const base = playniteItem("Mortal Shell", EPIC, "shell", pending);
    const beta = playniteItem("Mortal Shell Tech Beta", EPIC, "beta", { ...pending, playtimeMinutes: 180 });
    importRepo.state.pending = [base, beta];
    importRepo.state.open = [base, beta];
    const igdb = createFakeIgdb({
      titles: new Map([["Mortal Shell", [searchResult(7, "Mortal Shell", 2020)]]]),
      games: new Map([[7, matchedGame(7, "Mortal Shell")]]),
    });
    const { service } = setup({ importRepo, igdb });

    await service.advanceMatching(USER_ID);

    expect(igdb.searchMany).toHaveBeenCalledWith(["Mortal Shell"]);
    expect(importRepo.state.matches).toContainEqual({ itemId: beta.id, kind: "absorbed", baseItemId: base.id });
  });

  it("Nombre entre corchetes", async () => {
    const importRepo = createFakeImportRepo();
    const redacted = playniteItem("[REDACTED]", EPIC, "redacted", pending);
    importRepo.state.pending = [redacted];
    const igdb = createFakeIgdb({
      titles: new Map([["[REDACTED]", [searchResult(30, "[REDACTED]", 2024)]]]),
      games: new Map([[30, matchedGame(30, "[REDACTED]")]]),
    });
    const { service } = setup({ importRepo, igdb });

    await service.advanceMatching(USER_ID);

    expect(igdb.searchMany).toHaveBeenCalledWith(["[REDACTED]"]);
    expect(importRepo.state.matches).toEqual([
      { itemId: redacted.id, kind: "matched", game: expect.objectContaining({ igdbId: 30 }) },
    ]);
  });

  describe("mismo nombre desde varias fuentes", () => {
    it("Fortnite de IGN y de Epic", async () => {
      const importRepo = createFakeImportRepo();
      const ign = ignItem("Fortnite", { ...pending, year: 2017, ignScore: 8 });
      const epic = playniteItem("Fortnite", EPIC, "Fortnite", { ...pending, year: 2020, playtimeMinutes: 7200 });
      importRepo.state.pending = [ign, epic];
      const fortnites = [searchResult(1, "Fortnite", 2017), searchResult(2, "Fortnite", 2018)];
      const { service } = setup({ importRepo, igdb: createFakeIgdb({ titles: new Map([["Fortnite", fortnites]]) }) });

      await service.advanceMatching(USER_ID);

      expect(importRepo.state.matches).toEqual([
        { itemId: ign.id, kind: "candidates", candidates: fortnites },
        { itemId: epic.id, kind: "candidates", candidates: [fortnites[1], fortnites[0]], joinItemId: ign.id },
      ]);
    });

    it("Mismo nombre sin encontrar, en otra tanda: se suma al juego a revisar que espera", async () => {
      const importRepo = createFakeImportRepo();
      const waiting = entry("Snakebird Complete", [ignItem("Snakebird Complete", { matchState: "not_found" })], {
        igdbId: null,
        catalogGameId: null,
        catalog: null,
      });
      importRepo.state.review = openReview([waiting]);
      const epic = playniteItem("Snakebird Complete", EPIC, "snake", pending);
      importRepo.state.pending = [epic];
      const { service } = setup({ importRepo });

      await service.advanceMatching(USER_ID);

      expect(importRepo.state.matches).toEqual([{ itemId: epic.id, kind: "not_found", joinEntryId: waiting.id }]);
    });
  });

  describe("sin la edición", () => {
    const STYX = "Styx: Shards of Darkness";

    it("Título con la edición", async () => {
      const importRepo = createFakeImportRepo();
      const deluxe = playniteItem(`${STYX} - Deluxe Edition`, EPIC, "styx", { ...pending, year: 2021 });
      importRepo.state.pending = [deluxe];
      const styx = searchResult(40, STYX, 2017);
      const igdb = createFakeIgdb({ titles: new Map([[STYX, [styx]]]) });
      const { service } = setup({ importRepo, igdb });

      await service.advanceMatching(USER_ID);

      expect(igdb.searchMany).toHaveBeenNthCalledWith(1, [`${STYX} - Deluxe Edition`]);
      expect(igdb.searchMany).toHaveBeenNthCalledWith(2, [STYX]);
      expect(importRepo.state.matches).toEqual([{ itemId: deluxe.id, kind: "candidates", candidates: [styx] }]);
    });

    it("no busca sin la edición si la primera búsqueda dio candidatos", async () => {
      const importRepo = createFakeImportRepo();
      const title = "Control Ultimate Edition";
      importRepo.state.pending = [playniteItem(title, EPIC, "control", pending)];
      const candidates = [searchResult(1, "Control Ultimate Edition Remix", 2021), searchResult(2, "Control Ultimate Edition Plus", 2022)];
      const igdb = createFakeIgdb({ titles: new Map([[title, candidates]]) });
      const { service } = setup({ importRepo, igdb });

      await service.advanceMatching(USER_ID);

      expect(igdb.searchMany).toHaveBeenCalledTimes(1);
      expect(importRepo.state.matches.map((match) => match.kind)).toEqual(["candidates"]);
    });

    it("sin nada tampoco sin la edición, queda en «No lo encontré»", async () => {
      const importRepo = createFakeImportRepo();
      importRepo.state.pending = [ignItem("Snakebird Complete", pending)];
      const { service, igdb } = setup({ importRepo });

      await service.advanceMatching(USER_ID);

      expect(igdb.searchMany).toHaveBeenNthCalledWith(2, ["Snakebird"]);
      expect(importRepo.state.matches).toEqual([{ itemId: importRepo.state.pending[0].id, kind: "not_found" }]);
    });

    it("una tanda con 12 títulos con edición busca 10 sin la edición y deja 2 pendientes", async () => {
      const importRepo = createFakeImportRepo();
      importRepo.state.pending = Array.from({ length: 12 }, (_, index) =>
        playniteItem(`Juego ${index} Deluxe Edition`, EPIC, `g${index}`, pending),
      );
      const { service, igdb } = setup({ importRepo });

      await service.advanceMatching(USER_ID);

      expect(igdb.searchMany).toHaveBeenNthCalledWith(2, Array.from({ length: 10 }, (_, index) => `Juego ${index}`));
      expect(importRepo.state.matches.map((match) => match.itemId)).toEqual(
        importRepo.state.pending.slice(0, 10).map((item) => item.id),
      );
    });
  });

  it("una fila sin cruce queda not_found", async () => {
    const importRepo = createFakeImportRepo();
    importRepo.state.pending = [ignItem("Juego Perdido", pending)];
    const { service } = setup({ importRepo });

    await service.advanceMatching(USER_ID);

    expect(importRepo.state.matches).toEqual([{ itemId: importRepo.state.pending[0].id, kind: "not_found" }]);
  });

  it("un error de IGDB no deja la tanda a medias", async () => {
    const importRepo = createFakeImportRepo();
    importRepo.state.pending = [steamItem("Hades", "1145360", 10, pending), ignItem("Celeste", pending)];
    const igdb = createFakeIgdb({ externalIds: new Map([["steam:1145360", 1]]) });
    igdb.searchMany.mockRejectedValue(new IgdbUnavailableError());
    const { service } = setup({ importRepo, igdb });

    const advance = service.advanceMatching(USER_ID);

    await expect(advance).rejects.toBeInstanceOf(IgdbUnavailableError);
    expect(importRepo.saveMatches).not.toHaveBeenCalled();
  });

  it("sin filas pendientes no consulta IGDB", async () => {
    const importRepo = createFakeImportRepo();
    importRepo.state.review = { entries: [], library: [], pendingCount: 0, itemCount: 12 };
    const { service, igdb } = setup({ importRepo });

    const progress = await service.advanceMatching(USER_ID);

    expect(progress).toEqual({ done: 12, total: 12 });
    expect(igdb.findByExternalIds).not.toHaveBeenCalled();
    expect(importRepo.saveMatches).not.toHaveBeenCalled();
  });

  it("una fila sin tienda ni ID de Steam de IGN va directo a la búsqueda por título", async () => {
    const importRepo = createFakeImportRepo();
    importRepo.state.pending = [item({ title: "Crash Bandicoot", source: "ign", matchState: "pending" })];
    const { service, igdb } = setup({ importRepo });

    await service.advanceMatching(USER_ID);

    expect(igdb.findByExternalIds).not.toHaveBeenCalled();
    expect(igdb.searchMany).toHaveBeenCalledWith(["Crash Bandicoot"]);
  });
});

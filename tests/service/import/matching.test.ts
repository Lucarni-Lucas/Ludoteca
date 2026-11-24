import { describe, expect, it } from "vitest";

import { IgdbUnavailableError } from "@/adapter/igdb/errors";

import { EPIC, GOG, ignItem, item, playniteItem, STEAM, steamItem } from "../../model/import/import-fixtures";
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
    importRepo.state.pending = [ignItem("Overwatch", { ...pending, year: 2022 })];
    const candidates = [searchResult(1, "Overwatch", 2016), searchResult(2, "Overwatch 2", 2022)];
    const { service } = setup({ importRepo, igdb: createFakeIgdb({ titles: new Map([["Overwatch", candidates]]) }) });

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

  it("«[REDACTED]» y «Ubisoft Connect Services» van a «No lo encontré» sin buscar en IGDB", async () => {
    const importRepo = createFakeImportRepo();
    importRepo.state.pending = [
      playniteItem("[REDACTED]", EPIC, "x", pending),
      playniteItem("Ubisoft Connect Services", STEAM, "y", pending),
    ];
    const { service, igdb } = setup({ importRepo });

    await service.advanceMatching(USER_ID);

    expect(importRepo.state.matches.map((match) => match.kind)).toEqual(["not_found", "not_found"]);
    expect(igdb.searchMany).not.toHaveBeenCalled();
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

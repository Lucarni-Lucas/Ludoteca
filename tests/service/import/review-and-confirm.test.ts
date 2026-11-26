import { describe, expect, it } from "vitest";

import { ImportEntryNotFoundError, InvalidImportDecisionError } from "@/model/import/errors";
import { gamesInGroup } from "@/model/import/review";

import { entry, EPIC, ignItem, openReview, playniteItem, STEAM, steamItem } from "../../model/import/import-fixtures";
import { createFakeConnections, createFakeIgdb, createFakeImportRepo, matchedGame, setup, STATUSES, USER_ID } from "./fakes";

const CONNECTED = { storeId: STEAM.id, accountId: "76561197960287930", lastSyncedAt: null };

function withReview(entries: Parameters<typeof openReview>[0], library: Parameters<typeof openReview>[1] = []) {
  const importRepo = createFakeImportRepo();
  importRepo.state.review = openReview(entries, library);
  return importRepo;
}

describe("getOverview", () => {
  it("arma la revisión con la cuenta de Steam conectada y cuenta lo que está en «Listos para importar»", async () => {
    const celeste = entry("Celeste", [ignItem("Celeste", { ignStatuses: ["playing"], ignScore: 9 }), steamItem("Celeste", "1", 60)]);
    const portal = entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]);
    const { service } = setup({ importRepo: withReview([celeste, portal]), connections: createFakeConnections(CONNECTED) });

    const overview = await service.getOverview(USER_ID);

    expect(gamesInGroup(overview.review, "family").map((game) => game.title)).toEqual(["Portal 2"]);
    expect(overview.ready).toEqual({ games: 1, copies: 1 });
    expect(overview.steam).toEqual({ configured: true, accountId: CONNECTED.accountId });
  });

  it("sin la cuenta conectada, Portal 2 espera sin opciones", async () => {
    const portal = entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]);
    const { service } = setup({ importRepo: withReview([portal]) });

    const overview = await service.getOverview(USER_ID);

    expect(gamesInGroup(overview.review, "family")[0]).toMatchObject({ choices: [] });
    expect(overview.steam.accountId).toBeNull();
  });
});

describe("decide", () => {
  it("Retomar la revisión", async () => {
    const beholder = entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "2", 0)]);
    const { service, importRepo } = setup({ importRepo: withReview([beholder]) });

    await service.decide(USER_ID, [beholder.id], { kind: "choose", choice: { kind: "hidden" } });

    expect(importRepo.saveDecision).toHaveBeenCalledWith(USER_ID, [beholder.id], { answers: { playAnswer: "hidden" } });
    expect(importRepo.applyConfirmation).not.toHaveBeenCalled();
  });

  it("Responder en lote guarda una sola respuesta para todos", async () => {
    const entries = [
      entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]),
      entry("Watch Dogs", [playniteItem("Watch Dogs", STEAM, "243470")]),
    ];
    const { service, importRepo } = setup({ importRepo: withReview(entries), connections: createFakeConnections(CONNECTED) });

    await service.decide(USER_ID, entries.map((value) => value.id), {
      kind: "choose",
      choice: { kind: "copy_kind", copyKind: "family" },
    });

    expect(importRepo.saveDecision).toHaveBeenCalledTimes(1);
    expect(importRepo.saveDecision).toHaveBeenCalledWith(USER_ID, entries.map((value) => value.id), {
      copies: { storeId: STEAM.id, copyKind: "family", excluded: false },
    });
  });

  it("Volver desde otro grupo", async () => {
    const love = { igdbId: 40, baseIgdbId: 40, title: "Love", year: 2015, coverUrl: null };
    const chosen = entry("Love", [playniteItem("LOVE", EPIC, "love", { matchState: "candidates", candidates: [love], chosenIgdbId: 40 })], {
      igdbId: 40,
    });
    const { service, importRepo } = setup({ importRepo: withReview([chosen]) });

    await service.decide(USER_ID, [chosen.id], { kind: "reset" });

    expect(importRepo.clearDecision).toHaveBeenCalledWith(USER_ID, [chosen.id]);
    expect(importRepo.saveDecision).not.toHaveBeenCalled();
  });

  it("«Volver a revisar» borra las respuestas", async () => {
    const decided = entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] })], { answers: { playAnswer: "keep" } });
    const { service, importRepo } = setup({ importRepo: withReview([decided]) });

    await service.decide(USER_ID, [decided.id], { kind: "reset" });

    expect(importRepo.clearDecision).toHaveBeenCalledWith(USER_ID, [decided.id]);
    expect(importRepo.saveDecision).not.toHaveBeenCalled();
  });

  it("Volver después de elegir un candidato", async () => {
    const candidates = [
      { igdbId: 1, baseIgdbId: 1, title: "Crash Bandicoot", year: 1996, coverUrl: null },
      { igdbId: 2, baseIgdbId: 2, title: "Crash Bandicoot", year: 2004, coverUrl: null },
    ];
    const chosen = entry("Crash Bandicoot", [
      ignItem("Crash Bandicoot", { ignStatuses: ["beat"], matchState: "candidates", candidates, chosenIgdbId: 1 }),
    ]);
    const { service, importRepo } = setup({ importRepo: withReview([chosen]) });
    const before = await service.getOverview(USER_ID);

    await service.decide(USER_ID, [chosen.id], { kind: "reset" });

    expect(gamesInGroup(before.review, "ready").map((game) => game.title)).toEqual(["Crash Bandicoot"]);
    expect(importRepo.clearDecision).toHaveBeenCalledWith(USER_ID, [chosen.id]);
  });

  it("elegir un candidato trae sus datos de IGDB y lo vincula", async () => {
    const candidate = { igdbId: 7, baseIgdbId: 7, title: "Overwatch", year: 2016, coverUrl: null };
    const overwatch = entry("Overwatch", [ignItem("Overwatch", { matchState: "candidates", candidates: [candidate] })], { catalog: null });
    const igdb = createFakeIgdb({ games: new Map([[7, matchedGame(7, "Overwatch", { multiplayerOnly: true })]]) });
    const { service, importRepo } = setup({ importRepo: withReview([overwatch]), igdb });

    await service.decide(USER_ID, [overwatch.id], { kind: "choose", choice: { kind: "candidate", candidate } });

    expect(importRepo.matchEntry).toHaveBeenCalledWith(USER_ID, overwatch.id, expect.objectContaining({ igdbId: 7 }), candidate);
  });

  it("un id ajeno o inexistente da ImportEntryNotFoundError y no guarda nada", async () => {
    const own = entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] })]);
    const { service, importRepo } = setup({ importRepo: withReview([own]) });

    const decide = service.decide(USER_ID, [own.id, "00000000-0000-4000-8000-0000000000ff"], { kind: "choose", choice: { kind: "exclude" } });

    await expect(decide).rejects.toBeInstanceOf(ImportEntryNotFoundError);
    expect(importRepo.saveDecision).not.toHaveBeenCalled();
  });

  it("una decisión que no vale frena todo el lote", async () => {
    const entries = [entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]), entry("GTA V", [playniteItem("GTA V", EPIC, "gta")])];
    const { service, importRepo } = setup({ importRepo: withReview(entries), connections: createFakeConnections(CONNECTED) });

    const decide = service.decide(USER_ID, entries.map((value) => value.id), {
      kind: "choose",
      choice: { kind: "copy_kind", copyKind: "family" },
    });

    await expect(decide).rejects.toBeInstanceOf(InvalidImportDecisionError);
    expect(importRepo.saveDecision).not.toHaveBeenCalled();
  });
});

describe("searchAgain", () => {
  it("vincula el juego elegido en la búsqueda de IGDB", async () => {
    const crash = entry("Crash", [ignItem("Crash Bandicoot", { matchState: "not_found" })], { catalog: null, igdbId: null });
    const chosen = { igdbId: 3, baseIgdbId: 3, title: "Crash Bandicoot", year: 1996, coverUrl: null };
    const igdb = createFakeIgdb({ games: new Map([[3, matchedGame(3, "Crash Bandicoot")]]) });
    const { service, importRepo } = setup({ importRepo: withReview([crash]), igdb });

    await service.searchAgain(USER_ID, crash.id, chosen);

    expect(importRepo.matchEntry).toHaveBeenCalledWith(USER_ID, crash.id, expect.objectContaining({ igdbId: 3 }), chosen);
  });
});

describe("confirm", () => {
  it("Confirmar lo que está listo", async () => {
    const ready = entry("Celeste", [ignItem("Celeste", { ignStatuses: ["playing"], ignScore: 9 })]);
    const toReview = entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["beat", "quit"] })]);
    const { service, importRepo } = setup({ importRepo: withReview([ready, toReview]) });

    await service.confirm(USER_ID);

    expect(importRepo.state.confirmations).toHaveLength(1);
    expect(importRepo.state.confirmations[0].games.map((game) => game.entryId)).toEqual([ready.id]);
  });

  it("Juego ya puntuado", async () => {
    const hades = entry("Hades", [ignItem("Hades", { ignStatuses: ["beat"], ignScore: 9 }), playniteItem("Hades", EPIC, "hades")]);
    const library = [{ catalogGameId: hades.catalogGameId ?? "", libraryGameId: "game-hades", copies: [] }];
    const { service, importRepo } = setup({ importRepo: withReview([hades], library) });

    await service.confirm(USER_ID);

    expect(importRepo.state.confirmations[0].games[0].target).toEqual({ kind: "existing", libraryGameId: "game-hades" });
  });

  it("Segunda importación de Playnite", async () => {
    const upToDate = entry("GTA V", [playniteItem("GTA V", EPIC, "gta")]);
    const library = [{ catalogGameId: upToDate.catalogGameId ?? "", libraryGameId: "g", copies: [{ storeId: EPIC.id, storeGameId: "gta" }] }];
    const fresh = ["Nuevo 1", "Nuevo 2"].map((title) => entry(title, [playniteItem(title, EPIC, title)], { answers: { playAnswer: "keep" } }));
    const { service, importRepo } = setup({ importRepo: withReview([upToDate, ...fresh], library) });

    const summary = await service.confirm(USER_ID);

    expect(summary).toMatchObject({ games: 2, copies: 2 });
    expect(importRepo.state.confirmations[0].games.map((game) => game.entryId)).toEqual(fresh.map((value) => value.id));
  });

  it("Resumen final", async () => {
    const entries = [
      entry("Celeste", [ignItem("Celeste", { ignStatuses: ["playing"] }), steamItem("Celeste", "1", 60)]),
      entry("8BitMMO", [ignItem("8BitMMO", { ignStatuses: ["backlog"] }), steamItem("8BitMMO", "2", 0)], {
        answers: { playAnswer: "hidden" },
      }),
      entry("Excluido", [ignItem("Excluido")], { answers: { excluded: true } }),
    ];
    const { service } = setup({ importRepo: withReview(entries) });

    const summary = await service.confirm(USER_ID);

    expect(summary).toEqual({ games: 2, copies: 2, hidden: 1, excluded: 1 });
  });

  it("confirma de a 600 juegos, cada tanda por separado", async () => {
    const entries = Array.from({ length: 601 }, (_, index) =>
      entry(`Juego ${index}`, [ignItem(`Juego ${index}`, { ignStatuses: ["playing"], ignScore: 7 })]),
    );
    const { service, importRepo } = setup({ importRepo: withReview(entries) });

    const summary = await service.confirm(USER_ID);

    expect(importRepo.state.confirmations.map((plan) => plan.games.length)).toEqual([600, 1]);
    expect(summary.games).toBe(601);
  });

  it("pide los estados primero, para que existan los de fábrica", async () => {
    const ready = entry("Celeste", [ignItem("Celeste", { ignStatuses: ["playing"], ignScore: 9 })]);
    const { service, statusService } = setup({ importRepo: withReview([ready]) });

    await service.confirm(USER_ID);

    expect(statusService.listStatuses).toHaveBeenCalledWith(USER_ID);
  });
});

describe("respuestas de «Elegí un estado»", () => {
  it("la revisión ofrece solo las respuestas cuyo estado tiene el usuario", async () => {
    const terraria = entry("Terraria", [steamItem("Terraria", "105600", 12 * 60)]);
    const statuses = STATUSES.filter((status) => status.systemKey !== "tried");
    const { service } = setup({ importRepo: withReview([terraria]), statuses });

    const overview = await service.getOverview(USER_ID);

    const [game] = gamesInGroup(overview.review, "status");
    expect(game.choices.flatMap((choice) => (choice.kind === "status" ? [choice.status.systemKey] : []))).toEqual([
      "playing",
      "completed",
      "abandoned",
    ]);
  });
});

describe("los estados del usuario", () => {
  it("Estado renombrado", async () => {
    const renamed = STATUSES.map((value) => (value.systemKey === "completed" ? { ...value, name: "Terminado" } : value));
    const outerWilds = entry("Outer Wilds", [ignItem("Outer Wilds", { ignStatuses: ["beat"], ignScore: 10 })]);
    const { service, importRepo } = setup({ importRepo: withReview([outerWilds]), statuses: renamed });

    await service.confirm(USER_ID);

    const [plan] = importRepo.state.confirmations;
    const completed = renamed.find((value) => value.systemKey === "completed");
    expect(plan.games[0].target).toMatchObject({ kind: "igdb", values: { statusId: completed?.id } });
  });

  it("Estado propio", async () => {
    const replaying = { id: "status-rejugando", group: "in_progress" as const, name: "Rejugando", color: "lime" as const, position: 3, systemKey: null };
    const frostpunk = entry("Frostpunk", [steamItem("Frostpunk", "323190", 12 * 60)]);
    const { service, importRepo } = setup({ importRepo: withReview([frostpunk]), statuses: [...STATUSES, replaying] });

    await service.decide(USER_ID, [frostpunk.id], {
      kind: "choose",
      choice: { kind: "status", status: { id: replaying.id, name: replaying.name, systemKey: null } },
    });

    expect(importRepo.saveDecision).toHaveBeenCalledWith(USER_ID, [frostpunk.id], { answers: { statusId: replaying.id } });
  });

  it("confirma con el estado propio elegido", async () => {
    const replaying = { id: "status-rejugando", group: "in_progress" as const, name: "Rejugando", color: "lime" as const, position: 3, systemKey: null };
    const frostpunk = entry("Frostpunk", [steamItem("Frostpunk", "323190", 12 * 60)], { answers: { statusId: replaying.id } });
    const { service, importRepo } = setup({ importRepo: withReview([frostpunk]), statuses: [...STATUSES, replaying] });

    await service.confirm(USER_ID);

    expect(importRepo.state.confirmations[0].games[0].target).toMatchObject({ values: { statusId: replaying.id } });
  });

  it("arma la revisión con los estados del usuario, que se crean si todavía no tiene", async () => {
    const { service, statusService } = setup({ importRepo: withReview([]) });

    await service.getOverview(USER_ID);

    expect(statusService.listStatuses).toHaveBeenCalledWith(USER_ID);
  });
});

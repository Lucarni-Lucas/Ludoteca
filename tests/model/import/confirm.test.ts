import { describe, expect, it } from "vitest";

import { addSummaries, isEmptyPlan, planImportConfirmation } from "@/model/import/confirm";
import { DEFAULT_STATUSES, type Status } from "@/model/status/status";
import { StatusNotFoundError } from "@/model/status/errors";

import { entry, EPIC, ignItem, openReview, playniteItem, STEAM, steamItem } from "./import-fixtures";

const TODAY = "2026-11-23";
const STATUSES: readonly Status[] = DEFAULT_STATUSES.map((status) => ({ ...status, id: `status-${status.systemKey}` }));
const CONTEXT = { steamConnected: true, statuses: STATUSES, today: TODAY };

describe("planImportConfirmation", () => {
  it("Juego que nunca se va a jugar", () => {
    const mmo = entry("8BitMMO", [ignItem("8BitMMO", { ignStatuses: ["backlog"] }), steamItem("8BitMMO", "250420", 0)], {
      answers: { playAnswer: "not_interested" },
    });

    const plan = planImportConfirmation(openReview([mmo]), CONTEXT);

    expect(plan.games).toEqual([
      {
        entryId: mmo.id,
        target: {
          kind: "igdb",
          catalogGameId: mmo.catalogGameId,
          values: { statusId: "status-backlog", statusSince: TODAY, score: null, notInterested: true, endless: null, hltbHours: null },
        },
        copies: [{ storeId: STEAM.id, kind: "purchased", storeGameId: "250420", playtimeMinutes: 0 }],
      },
    ]);
  });

  it("Juego ya puntuado", () => {
    const hades = entry("Hades", [ignItem("Hades", { ignStatuses: ["beat"], ignScore: 9 }), playniteItem("Hades", EPIC, "hades")]);
    const library = [{ catalogGameId: hades.catalogGameId ?? "", libraryGameId: "game-hades", copies: [] }];

    const plan = planImportConfirmation(openReview([hades], library), CONTEXT);

    expect(plan.games).toEqual([
      {
        entryId: hades.id,
        target: { kind: "existing", libraryGameId: "game-hades" },
        copies: [expect.objectContaining({ storeId: EPIC.id, kind: "free" })],
      },
    ]);
    expect(plan.summary).toMatchObject({ games: 0, copies: 1 });
  });

  it("Confirmar lo que está listo", () => {
    const ready = entry("Celeste", [ignItem("Celeste", { ignStatuses: ["playing"], ignScore: 9 })]);
    const toReview = entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["beat", "quit"] })]);
    const family = entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]);

    const plan = planImportConfirmation(openReview([ready, toReview, family]), CONTEXT);

    expect(plan.games.map((game) => game.entryId)).toEqual([ready.id]);
    expect(plan.entryIds).toEqual([ready.id]);
  });

  it("acepta «sin fin» como Jugado y lo marca sin fin, con la duración de HowLongToBeat", () => {
    const amongUs = entry("Among Us", [ignItem("Among Us", { ignStatuses: ["beat"], ignScore: 6, hltbMainHours: 9 })], {
      multiplayerOnly: true,
      answers: { endlessAnswer: true },
    });

    const plan = planImportConfirmation(openReview([amongUs]), CONTEXT);

    expect(plan.games[0].target).toMatchObject({
      values: { statusId: "status-played", endless: true, score: 6, hltbHours: 9 },
    });
  });

  it("Resumen final", () => {
    const entries = [
      entry("Celeste", [ignItem("Celeste", { ignStatuses: ["playing"] }), steamItem("Celeste", "1", 60), playniteItem("Celeste", EPIC, "c")]),
      entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "2", 0)], {
        answers: { playAnswer: "not_interested" },
      }),
      entry("Portal 2", [playniteItem("Portal 2", STEAM, "620", { excluded: true }), playniteItem("Portal 2", EPIC, "p")], {
        answers: { statusKey: "backlog" },
      }),
      entry("Excluido", [ignItem("Excluido")], { answers: { excluded: true } }),
    ];

    const plan = planImportConfirmation(openReview(entries), CONTEXT);

    expect(plan.summary).toEqual({ games: 3, copies: 4, notInterested: 1, excluded: 2 });
    expect(plan.entryIds).toHaveLength(4);
  });

  it("Segunda importación de Playnite", () => {
    const upToDate = entry("GTA V", [playniteItem("GTA V", EPIC, "gta")]);
    const library = [{ catalogGameId: upToDate.catalogGameId ?? "", libraryGameId: "game-gta", copies: [{ storeId: EPIC.id, storeGameId: "gta" }] }];
    const fresh = ["Nuevo 1", "Nuevo 2"].map((title) =>
      entry(title, [playniteItem(title, EPIC, title)], { answers: { playAnswer: "keep" } }),
    );

    const plan = planImportConfirmation(openReview([upToDate, ...fresh], library), CONTEXT);

    expect(plan.games.map((game) => game.entryId)).toEqual(fresh.map((value) => value.id));
    expect(plan.summary).toMatchObject({ games: 2, copies: 2 });
  });

  it("una copia a mano sin ID en la tienda evita otra de la misma tienda", () => {
    const hades = entry("Hades", [steamItem("Hades", "1145360", 100), playniteItem("Hades", EPIC, "hades")]);
    const library = [{ catalogGameId: hades.catalogGameId ?? "", libraryGameId: "game-hades", copies: [{ storeId: STEAM.id, storeGameId: null }] }];

    const plan = planImportConfirmation(openReview([hades], library), CONTEXT);

    expect(plan.games[0].copies.map((copy) => copy.storeId)).toEqual([EPIC.id]);
  });

  it("un juego cargado a mano desde «No lo encontré» entra con su título y año", () => {
    const crash = entry("Crash", [ignItem("Crash Bandicoot", { matchState: "not_found", ignStatuses: ["beat"], ignScore: 9, year: 1996 })], {
      igdbId: null,
      catalogGameId: null,
      catalog: null,
      answers: { manualTitle: "Crash Bandicoot" },
    });

    const plan = planImportConfirmation(openReview([crash]), CONTEXT);

    expect(plan.games[0].target).toEqual({
      kind: "manual",
      title: "Crash Bandicoot",
      year: 1996,
      values: expect.objectContaining({ statusId: "status-completed", score: 9 }),
    });
  });

  it("un juego en «Listos para importar» sin cruce ni «Cargar a mano» sigue esperando", () => {
    const orphan = entry("Raro", [playniteItem("Raro", EPIC, "r", { matchState: "not_found", copyKind: "purchased" })], {
      igdbId: null,
      catalogGameId: null,
      catalog: null,
    });

    const plan = planImportConfirmation(openReview([orphan]), CONTEXT);

    expect(plan.games).toEqual([]);
    expect(plan.entryIds).toEqual([]);
  });

  it("Demo sin su juego", () => {
    const demo = entry("Cuphead Demo", [playniteItem("Cuphead Demo", STEAM, "268910", { matchState: "not_found" })], {
      igdbId: null,
      catalogGameId: null,
      catalog: null,
      answers: { excluded: true },
    });

    const plan = planImportConfirmation(openReview([demo]), CONTEXT);

    expect(plan.games).toEqual([]);
    expect(plan.entryIds).toEqual([demo.id]);
    expect(plan.summary).toEqual({ games: 0, copies: 0, notInterested: 0, excluded: 1 });
  });

  it("un plan sin nada en «Listos para importar» está vacío", () => {
    const toReview = entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["beat", "quit"] })]);

    const plan = planImportConfirmation(openReview([toReview]), CONTEXT);

    expect(isEmptyPlan(plan)).toBe(true);
    expect(plan.summary).toEqual({ games: 0, copies: 0, notInterested: 0, excluded: 0 });
  });

  it("un estado que el usuario no tiene da StatusNotFoundError", () => {
    const celeste = entry("Celeste", [ignItem("Celeste", { ignStatuses: ["playing"], ignScore: 9 })]);

    const plan = () => planImportConfirmation(openReview([celeste]), { ...CONTEXT, statuses: [] });

    expect(plan).toThrow(StatusNotFoundError);
  });
});

describe("addSummaries", () => {
  it("suma los resúmenes de dos tandas", () => {
    const first = { games: 600, copies: 610, notInterested: 40, excluded: 3 };

    const total = addSummaries(first, { games: 10, copies: 12, notInterested: 1, excluded: 1 });

    expect(total).toEqual({ games: 610, copies: 622, notInterested: 41, excluded: 4 });
  });
});

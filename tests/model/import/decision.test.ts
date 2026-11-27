import { describe, expect, it } from "vitest";

import { decidedChoice, type DecisionPlan, planDecision } from "@/model/import/decision";
import { InvalidImportDecisionError } from "@/model/import/errors";
import { type DecisionWrite, type ImportEntry, NO_ANSWERS } from "@/model/import/import-entry";
import { canGoBack, type ReviewGame, reviewGame } from "@/model/import/review";

import { entry, EPIC, ignItem, playniteItem, STATUSES, STEAM, statusRef, steamItem } from "./import-fixtures";

const CONTEXT = { statuses: STATUSES };
const CONNECTED = { steamConnected: true, statuses: STATUSES };
const CANDIDATE = { igdbId: 7, baseIgdbId: 7, title: "Overwatch", year: 2016, coverUrl: null };

function view(value: ImportEntry): ReviewGame {
  return reviewGame(value, [], CONNECTED) as ReviewGame;
}

/** Lo que haría el repositorio con la escritura: así se ve adónde va el juego después. */
function applyWrite(value: ImportEntry, write: DecisionWrite): ImportEntry {
  const { copies } = write;

  return {
    ...value,
    answers: { ...value.answers, ...write.answers },
    items: value.items.map((current) =>
      copies && current.store?.id === copies.storeId
        ? { ...current, copyKind: copies.copyKind, excluded: copies.excluded }
        : current,
    ),
  };
}

function applyPlan(entries: readonly ImportEntry[], plan: DecisionPlan): readonly ImportEntry[] {
  return entries.map((value) => {
    const writes = plan.writes.filter((group) => group.entryIds.includes(value.id));
    const reset = plan.resets.includes(value.id);
    const written = writes.reduce((current, group) => applyWrite(current, group.write), value);
    return reset ? { ...written, answers: NO_ANSWERS } : written;
  });
}

describe("planDecision", () => {
  it("Decidir pasa a «Listos para importar»", () => {
    const beholder = entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "475550", 0)]);
    const game = view(beholder);

    const plan = planDecision([game], { kind: "choose", choice: { kind: "hidden" } }, CONTEXT);

    const [after] = applyPlan([beholder], plan).map(view);
    expect(game.group).toBe("play");
    expect(after).toMatchObject({ group: "ready", decided: true, suggestion: { hidden: true } });
    expect(decidedChoice({ kind: "choose", choice: { kind: "hidden" } })).toEqual({ kind: "hidden" });
  });

  it("Responder en lote", () => {
    const entries = [
      entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]),
      entry("Watch Dogs", [playniteItem("Watch Dogs", STEAM, "243470")]),
    ];

    const plan = planDecision(entries.map(view), { kind: "choose", choice: { kind: "copy_kind", copyKind: "family" } }, CONTEXT);

    expect(plan.writes).toEqual([
      {
        entryIds: entries.map((value) => value.id),
        write: { copies: { storeId: STEAM.id, copyKind: "family", excluded: false } },
      },
    ]);
    const after = applyPlan(entries, plan).map(view);
    expect(after.map((game) => game.group)).toEqual(["ready", "ready"]);
    expect(after.map((game) => game.suggestion.copies[0].kind)).toEqual(["family", "family"]);
  });

  it("en lote, cada juego pasa al grupo que le toca después de la respuesta", () => {
    const entries = [
      entry("Portal 2", [playniteItem("Portal 2", STEAM, "620"), playniteItem("Portal 2", EPIC, "p")]),
      entry("Watch Dogs", [playniteItem("Watch Dogs", STEAM, "243470")]),
    ];

    const plan = planDecision(entries.map(view), { kind: "choose", choice: { kind: "copy_kind", copyKind: "family" } }, CONTEXT);

    const after = applyPlan(entries, plan).map(view);
    expect(after.map((game) => game.group)).toEqual(["play", "ready"]);
  });

  it("Cambiar el tipo en lote", () => {
    const entries = ["A", "B", "C", "D", "E"].map((title) => entry(title, [playniteItem(title, EPIC, title)]));

    const plan = planDecision(entries.map(view), { kind: "copy_kind", storeId: EPIC.id, copyKind: "purchased" }, CONTEXT);

    expect(plan.writes).toHaveLength(1);
    expect(plan.writes[0].entryIds).toHaveLength(5);
    const kinds = applyPlan(entries, plan).map((value) => view(value).suggestion.copies[0].kind);
    expect(kinds).toEqual(["purchased", "purchased", "purchased", "purchased", "purchased"]);
  });

  it.each([
    ["Sí, no se termina", { kind: "endless" as const }, { endlessAnswer: true }],
    ["No, lo terminé", { kind: "completed" as const }, { endlessAnswer: false }],
    ["No importar", { kind: "exclude" as const }, { excluded: true }],
  ])("«%s» en «¿Es sin fin?» guarda su respuesta", (_answer, choice, answers) => {
    const amongUs = entry("Among Us", [ignItem("Among Us", { ignStatuses: ["beat"] })], { multiplayerOnly: true });

    const plan = planDecision([view(amongUs)], { kind: "choose", choice }, CONTEXT);

    expect(plan.writes).toEqual([{ entryIds: [amongUs.id], write: { answers } }]);
  });

  it("Otro estado", () => {
    const frostpunk = entry("Frostpunk", [steamItem("Frostpunk", "323190", 12 * 60)]);
    const plan = planDecision([view(frostpunk)], { kind: "choose", choice: { kind: "status", status: statusRef("paused") } }, CONTEXT);

    const [after] = applyPlan([frostpunk], plan).map(view);
    expect(after).toMatchObject({ group: "ready", suggestion: { status: { systemKey: "paused" } } });
  });

  it.each([
    ["¿Cuál de estos es?", entry("Doom", [ignItem("Doom", { matchState: "candidates", candidates: [CANDIDATE, { ...CANDIDATE, igdbId: 8, baseIgdbId: 8 }] })], { igdbId: null, catalog: null })],
    ["¿Cómo lo dejaste?", entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["beat", "quit"] })])],
    ["No lo encontré", entry("Crash", [ignItem("Crash", { matchState: "not_found" })], { igdbId: null, catalog: null })],
  ])("«Sí, algún día» en «%s» da InvalidImportDecisionError: no es una respuesta del grupo", (_group, value) => {
    const game = view(value);

    const decide = () => planDecision([game], { kind: "choose", choice: { kind: "keep" } }, CONTEXT);

    expect(decide).toThrow(InvalidImportDecisionError);
  });

  it("«No importar» vale en lote en las preguntas de a un juego", () => {
    const entries = [
      entry("Doom", [ignItem("Doom", { matchState: "candidates", candidates: [CANDIDATE] })], { igdbId: null, catalog: null }),
      entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["beat", "quit"] })]),
      entry("Crash", [ignItem("Crash", { matchState: "not_found" })], { igdbId: null, catalog: null }),
    ];

    const plan = planDecision(entries.map(view), { kind: "choose", choice: { kind: "exclude" } }, CONTEXT);

    expect(plan.writes).toEqual([{ entryIds: entries.map((value) => value.id), write: { answers: { excluded: true } } }]);
  });

  it("un candidato elegido se pide aparte para traer sus datos de IGDB", () => {
    const overwatch = entry("Overwatch", [ignItem("Overwatch", { matchState: "candidates", candidates: [CANDIDATE] })], {
      igdbId: null,
      catalog: null,
    });

    const plan = planDecision([view(overwatch)], { kind: "choose", choice: { kind: "candidate", candidate: CANDIDATE } }, CONTEXT);

    expect(plan).toEqual({ writes: [], resets: [], candidates: [{ entryId: overwatch.id, candidate: CANDIDATE }] });
  });

  it("«Cargar a mano» guarda el título de la fila", () => {
    const crash = entry("Crash Bandicoot", [ignItem("Crash Bandicoot", { matchState: "not_found" })], {
      igdbId: null,
      catalog: null,
    });

    const plan = planDecision([view(crash)], { kind: "choose", choice: { kind: "manual" } }, CONTEXT);

    expect(plan.writes[0].write).toEqual({ answers: { manualTitle: "Crash Bandicoot" } });
  });

  it("«No importar» en «¿Es de tu familia?» deja afuera el juego entero", () => {
    const portal = entry("Portal 2", [ignItem("Portal 2", { ignStatuses: ["beat"], ignScore: 9 }), playniteItem("Portal 2", STEAM, "620")]);

    const plan = planDecision([view(portal)], { kind: "choose", choice: { kind: "exclude" } }, CONTEXT);

    expect(plan.writes[0].write).toEqual({ answers: { excluded: true } });
  });

  it("«Otro estado» solo abre la lista: no decide nada", () => {
    const game = view(entry("Frostpunk", [steamItem("Frostpunk", "323190", 12 * 60)]));

    const decide = () => planDecision([game], { kind: "choose", choice: { kind: "other_status" } }, CONTEXT);

    expect(decide).toThrow(InvalidImportDecisionError);
  });

  it("Familia en un juego sin copia de Steam da InvalidImportDecisionError", () => {
    const game = view(entry("GTA V", [playniteItem("GTA V", EPIC, "gta")]));

    const decide = () => planDecision([game], { kind: "choose", choice: { kind: "copy_kind", copyKind: "family" } }, CONTEXT);

    expect(decide).toThrow(InvalidImportDecisionError);
  });

  it("Familia en la copia de otra tienda da InvalidImportDecisionError", () => {
    const game = view(entry("GTA V", [playniteItem("GTA V", EPIC, "gta")]));

    const decide = () => planDecision([game], { kind: "copy_kind", storeId: EPIC.id, copyKind: "family" }, CONTEXT);

    expect(decide).toThrow(InvalidImportDecisionError);
  });

  it("un candidato que no está en la lista da InvalidImportDecisionError", () => {
    const listed = { igdbId: 7, baseIgdbId: 7, title: "Overwatch", year: 2016, coverUrl: null };
    const game = view(
      entry("Overwatch", [ignItem("Overwatch", { matchState: "candidates", candidates: [listed] })], { catalog: null }),
    );
    const other = { ...listed, igdbId: 99, baseIgdbId: 99 };

    const decide = () => planDecision([game], { kind: "choose", choice: { kind: "candidate", candidate: other } }, CONTEXT);

    expect(decide).toThrow(InvalidImportDecisionError);
  });

  it("una opción de otro grupo da InvalidImportDecisionError", () => {
    const game = view(entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]));

    const decide = () => planDecision([game], { kind: "choose", choice: { kind: "endless" } }, CONTEXT);

    expect(decide).toThrow(InvalidImportDecisionError);
  });

  it("un estado que el usuario no tiene da InvalidImportDecisionError", () => {
    const game = view(entry("Terraria", [playniteItem("Terraria", EPIC, "t", { playtimeMinutes: 600 })]));

    const decide = () => planDecision([game], { kind: "choose", choice: { kind: "status", status: { id: "otro", name: "Otro", systemKey: null } } }, CONTEXT);

    expect(decide).toThrow(InvalidImportDecisionError);
  });

  it("Volver desde otro grupo", () => {
    const love = { igdbId: 40, baseIgdbId: 40, title: "Love", year: 2015, coverUrl: null };
    const chosen = entry("Love", [playniteItem("LOVE", EPIC, "love", { matchState: "candidates", candidates: [love], chosenIgdbId: 40 })], {
      igdbId: 40,
    });
    const game = view(chosen);

    const plan = planDecision([game], { kind: "reset" }, CONTEXT);

    expect(game.group).toBe("play");
    expect(canGoBack(game)).toBe(true);
    expect(plan.resets).toEqual([chosen.id]);
  });

  it("un juego cargado a mano vuelve a «No lo encontré»", () => {
    const manual = entry(
      "Juego viejo",
      [ignItem("Juego viejo", { ignStatuses: ["backlog"], matchState: "not_found" }), playniteItem("Juego viejo", EPIC, "viejo", { matchState: "not_found" })],
      {
      igdbId: null,
      catalogGameId: null,
      catalog: null,
        answers: { manualTitle: "Juego viejo" },
      },
    );

    const plan = planDecision([view(manual)], { kind: "reset" }, CONTEXT);

    const [after] = applyPlan([manual], plan).map(view);
    expect(view(manual).group).toBe("play");
    expect(after.group).toBe("not_found");
  });

  it("en «¿Cuál de estos es?» no se ofrece «Volver a revisar» aunque haya cambiado el tipo de copia", () => {
    const doom = entry("Doom", [playniteItem("Doom", EPIC, "doom", { matchState: "candidates", candidates: [CANDIDATE], copyKind: "purchased" })], {
      igdbId: null,
      catalog: null,
    });

    const game = view(doom);

    expect(game).toMatchObject({ group: "which", decided: true });
    expect(canGoBack(game)).toBe(false);
  });

  it("«Volver a revisar» devuelve el juego a su grupo", () => {
    const beholder = entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "475550", 0)], {
      answers: { playAnswer: "hidden" },
    });
    const decided = view(beholder);

    const plan = planDecision([decided], { kind: "reset" }, CONTEXT);

    const [after] = applyPlan([beholder], plan).map(view);
    expect(decided.group).toBe("ready");
    expect(plan.resets).toEqual([beholder.id]);
    expect(after.group).toBe("play");
  });
});

describe("respuestas de los estados nuevos", () => {
  const REPLAYING = { id: "rejugando", group: "in_progress" as const, name: "Rejugando", color: "lime" as const, position: 3, systemKey: null };

  it("Estado propio", () => {
    const frostpunk = entry("Frostpunk", [steamItem("Frostpunk", "323190", 12 * 60)]);
    const context = { statuses: [...STATUSES, REPLAYING] };
    const choice = { kind: "status" as const, status: { id: REPLAYING.id, name: REPLAYING.name, systemKey: null } };

    const plan = planDecision([view(frostpunk)], { kind: "choose", choice }, context);

    expect(plan.writes).toEqual([{ entryIds: [frostpunk.id], write: { answers: { statusId: "rejugando" } } }]);
  });

  it("«Ya lo jugué» guarda la respuesta y el juego pasa a «Elegí un estado»", () => {
    const celeste = entry("Celeste", [ignItem("Celeste", { ignStatuses: ["backlog"] }), steamItem("Celeste", "504230", 0)]);

    const plan = planDecision([view(celeste)], { kind: "choose", choice: { kind: "played" } }, CONTEXT);

    const [after] = applyPlan([celeste], plan).map(view);
    expect(plan.writes).toEqual([{ entryIds: [celeste.id], write: { answers: { playAnswer: "played" } } }]);
    expect(after.group).toBe("status");
  });

  it("«Ocultar» guarda el Backlog del usuario y la marca oculto", () => {
    const terraria = entry("Terraria", [steamItem("Terraria", "105600", 12 * 60)]);

    const plan = planDecision([view(terraria)], { kind: "choose", choice: { kind: "hide" } }, CONTEXT);

    const [after] = applyPlan([terraria], plan).map(view);
    expect(plan.writes).toEqual([{ entryIds: [terraria.id], write: { answers: { statusId: "backlog", playAnswer: "hidden" } } }]);
    expect(after).toMatchObject({ group: "ready", suggestion: { hidden: true, status: { systemKey: "backlog" } } });
  });

  it("un estado que no se le ofrece al juego da InvalidImportDecisionError", () => {
    const hunt = entry("Hunt: Showdown", [playniteItem("Hunt: Showdown", EPIC, "hunt", { playtimeMinutes: 25 * 60 })], {
      multiplayerOnly: true,
    });

    const decide = () => planDecision([view(hunt)], { kind: "choose", choice: { kind: "status", status: statusRef("completed") } }, CONTEXT);

    expect(decide).toThrow(InvalidImportDecisionError);
  });

  it("un estado desactivado no se puede elegir", () => {
    const frostpunk = entry("Frostpunk", [steamItem("Frostpunk", "323190", 12 * 60)]);
    const context = { statuses: STATUSES.filter(({ systemKey }) => systemKey !== "abandoned") };
    const game = reviewGame(frostpunk, [], { steamConnected: true, ...context }) as ReviewGame;

    const decide = () => planDecision([game], { kind: "choose", choice: { kind: "status", status: statusRef("abandoned") } }, context);

    expect(decide).toThrow(InvalidImportDecisionError);
  });
});

describe("«¿Cómo lo dejaste?» en un juego solo multijugador", () => {
  it("«Lo terminaste» vale aunque no se le ofrezca «Completado» y el juego pasa a «¿Es sin fin?»", () => {
    const overwatch = entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["beat", "quit"], ignScore: 6 })], { multiplayerOnly: true });

    const plan = planDecision([view(overwatch)], { kind: "choose", choice: { kind: "status", status: statusRef("completed") } }, CONTEXT);

    const [after] = applyPlan([overwatch], plan).map(view);
    expect(after.group).toBe("endless");
  });
});

describe("«Otro estado» y la marca «Sin fin»", () => {
  const hunt = () =>
    entry("Hunt: Showdown", [playniteItem("Hunt: Showdown", EPIC, "hunt", { playtimeMinutes: 25 * 60 })], { multiplayerOnly: true });

  it("Otro estado: «Jugado» en un juego con final, con el aviso, guarda el estado y la marca", () => {
    const frostpunk = entry("Frostpunk", [steamItem("Frostpunk", "323190", 12 * 60)]);
    const choice = { kind: "status" as const, status: statusRef("played"), endless: true };

    const plan = planDecision([view(frostpunk)], { kind: "choose", choice }, CONTEXT);

    const [after] = applyPlan([frostpunk], plan).map(view);
    expect(plan.writes).toEqual([{ entryIds: [frostpunk.id], write: { answers: { statusId: "played", endlessAnswer: true } } }]);
    expect(after).toMatchObject({ group: "ready", suggestion: { status: { systemKey: "played" }, endless: true } });
  });

  it("«Completado» en un juego solo multijugador, con el aviso, le saca la marca", () => {
    const value = hunt();
    const choice = { kind: "status" as const, status: statusRef("completed"), endless: false };

    const plan = planDecision([view(value)], { kind: "choose", choice }, CONTEXT);

    const [after] = applyPlan([value], plan).map(view);
    expect(after).toMatchObject({ group: "ready", endless: false, suggestion: { status: { systemKey: "completed" }, endless: false } });
  });

  it("un estado que cambia la marca sin el aviso da InvalidImportDecisionError", () => {
    const frostpunk = entry("Frostpunk", [steamItem("Frostpunk", "323190", 12 * 60)]);

    const decide = () => planDecision([view(frostpunk)], { kind: "choose", choice: { kind: "status", status: statusRef("played") } }, CONTEXT);

    expect(decide).toThrow(InvalidImportDecisionError);
  });

  it("las respuestas fijas de «Elegí un estado» no piden el aviso", () => {
    const value = hunt();

    const plan = planDecision([view(value)], { kind: "choose", choice: { kind: "status", status: statusRef("played") } }, CONTEXT);

    expect(plan.writes).toEqual([{ entryIds: [value.id], write: { answers: { statusId: "played" } } }]);
  });

  it("en lote, el aviso vale para los que cambian y los demás guardan solo el estado", () => {
    const frostpunk = entry("Frostpunk", [steamItem("Frostpunk", "323190", 12 * 60)]);
    const value = hunt();
    const choice = { kind: "status" as const, status: statusRef("played"), endless: true };

    const plan = planDecision([view(frostpunk), view(value)], { kind: "choose", choice }, CONTEXT);

    expect(plan.writes).toEqual([
      { entryIds: [frostpunk.id], write: { answers: { statusId: "played", endlessAnswer: true } } },
      { entryIds: [value.id], write: { answers: { statusId: "played" } } },
    ]);
  });
});

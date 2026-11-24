import { describe, expect, it } from "vitest";

import { decidedChoice, type DecisionPlan, planDecision } from "@/model/import/decision";
import { InvalidImportDecisionError } from "@/model/import/errors";
import { type DecisionWrite, type ImportEntry, NO_ANSWERS } from "@/model/import/import-entry";
import { type ReviewGame, reviewGame } from "@/model/import/review";

import { entry, EPIC, ignItem, playniteItem, STEAM, steamItem } from "./import-fixtures";

const CONTEXT = { statusKeys: ["playing", "backlog", "wishlist", "completed", "abandoned", "played"] };
const CONNECTED = { steamConnected: true };
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

    const plan = planDecision([game], { kind: "choose", choice: { kind: "not_interested" } }, CONTEXT);

    const [after] = applyPlan([beholder], plan).map(view);
    expect(game.group).toBe("play");
    expect(after).toMatchObject({ group: "ready", decided: true, suggestion: { notInterested: true } });
    expect(decidedChoice(game, { kind: "choose", choice: { kind: "not_interested" } })).toEqual({ kind: "not_interested" });
  });

  it("Pasar lo marcado en lote", () => {
    const entries = [
      entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]),
      entry("Watch Dogs", [playniteItem("Watch Dogs", STEAM, "243470")]),
    ];

    const plan = planDecision(entries.map(view), { kind: "accept" }, CONTEXT);

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

  it("Cambiar el tipo en lote", () => {
    const entries = ["A", "B", "C", "D", "E"].map((title) => entry(title, [playniteItem(title, EPIC, title)]));

    const plan = planDecision(entries.map(view), { kind: "copy_kind", storeId: EPIC.id, copyKind: "purchased" }, CONTEXT);

    expect(plan.writes).toHaveLength(1);
    expect(plan.writes[0].entryIds).toHaveLength(5);
    const kinds = applyPlan(entries, plan).map((value) => view(value).suggestion.copies[0].kind);
    expect(kinds).toEqual(["purchased", "purchased", "purchased", "purchased", "purchased"]);
  });

  it("«Pasar a Listos» guarda la sugerencia marcada de cada juego", () => {
    const entries = [
      entry("Among Us", [ignItem("Among Us", { ignStatuses: ["beat"] })], { multiplayerOnly: true }),
      entry("112 Operator", [playniteItem("112 Operator", EPIC, "operator", { playtimeMinutes: 0 })]),
    ];

    const plan = planDecision(entries.map(view), { kind: "accept" }, CONTEXT);

    expect(plan.writes.map((group) => group.write)).toEqual([
      { answers: { endlessAnswer: true } },
      { answers: { playAnswer: "keep" } },
    ]);
  });

  it.each([
    ["¿Cuál de estos es?", entry("Doom", [ignItem("Doom", { matchState: "candidates", candidates: [CANDIDATE, { ...CANDIDATE, igdbId: 8, baseIgdbId: 8 }] })], { igdbId: null, catalog: null })],
    ["¿Cómo lo dejaste?", entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["beat", "quit"] })])],
    ["No lo encontré", entry("Crash", [ignItem("Crash", { matchState: "not_found" })], { igdbId: null, catalog: null })],
  ])("«Pasar a Listos» en «%s» da InvalidImportDecisionError", (_group, value) => {
    const game = view(value);

    const decide = () => planDecision([game], { kind: "accept" }, CONTEXT);

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

  it("«No importar» la copia de un familiar la excluye", () => {
    const portal = entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]);

    const plan = planDecision([view(portal)], { kind: "choose", choice: { kind: "exclude_copy" } }, CONTEXT);

    expect(plan.writes[0].write).toEqual({ copies: { storeId: STEAM.id, copyKind: null, excluded: true } });
  });

  it("«Pasar a Listos» en un juego de «Listos para importar» no escribe nada", () => {
    const ready = entry("Celeste", [ignItem("Celeste", { ignStatuses: ["playing"], ignScore: 9 })]);

    const plan = planDecision([view(ready)], { kind: "accept" }, CONTEXT);

    expect(plan).toEqual({ writes: [], resets: [], candidates: [] });
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

    const decide = () => planDecision([game], { kind: "choose", choice: { kind: "status", statusKey: "otro" } }, CONTEXT);

    expect(decide).toThrow(InvalidImportDecisionError);
  });

  it("«Volver a revisar» devuelve el juego a su grupo", () => {
    const beholder = entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "475550", 0)], {
      answers: { playAnswer: "not_interested" },
    });
    const decided = view(beholder);

    const plan = planDecision([decided], { kind: "reset" }, CONTEXT);

    const [after] = applyPlan([beholder], plan).map(view);
    expect(decided.group).toBe("ready");
    expect(plan.resets).toEqual([beholder.id]);
    expect(after.group).toBe("play");
  });
});

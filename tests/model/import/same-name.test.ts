import { describe, expect, it } from "vitest";

import type { ImportCandidate, ImportItem, ItemMatch } from "@/model/import/import-entry";
import { awaitsIdentity, joinSameName } from "@/model/import/same-name";

import { entry, EPIC, ignItem, playniteItem } from "./import-fixtures";

const FORTNITES: readonly ImportCandidate[] = [
  { igdbId: 1, baseIgdbId: 1, title: "Fortnite", year: 2017, coverUrl: null },
  { igdbId: 2, baseIgdbId: 2, title: "Fortnite", year: 2018, coverUrl: null },
];

function candidates(value: ImportItem): ItemMatch {
  return { itemId: value.id, kind: "candidates", candidates: FORTNITES };
}

function waiting(title: string, items: readonly ImportItem[], options: Parameters<typeof entry>[2] = {}) {
  return entry(title, items, { igdbId: null, catalogGameId: null, catalog: null, ...options });
}

describe("joinSameName", () => {
  it("Fortnite de IGN y de Epic", () => {
    const ign = ignItem("Fortnite", { year: 2017, matchState: "pending" });
    const epic = playniteItem("Fortnite", EPIC, "Fortnite", { year: 2020, matchState: "pending" });

    const joined = joinSameName([candidates(ign), candidates(epic)], [ign, epic], []);

    expect(joined).toEqual([candidates(ign), { ...candidates(epic), joinItemId: ign.id }]);
  });

  it("Mismo nombre sin encontrar", () => {
    const ign = ignItem("Snakebird Complete", { matchState: "pending" });
    const epic = playniteItem("Snakebird Complete", EPIC, "snake", { matchState: "pending" });
    const matches: ItemMatch[] = [
      { itemId: ign.id, kind: "not_found" },
      { itemId: epic.id, kind: "not_found" },
    ];

    const joined = joinSameName(matches, [ign, epic], []);

    expect(joined[1]).toEqual({ itemId: epic.id, kind: "not_found", joinItemId: ign.id });
  });

  it("el mismo nombre sin acentos, mayúsculas ni signos es el mismo", () => {
    const ign = ignItem("Q.U.B.E. 2", { matchState: "pending" });
    const epic = playniteItem("QUBE 2", EPIC, "Auk", { matchState: "pending" });

    const joined = joinSameName([{ itemId: ign.id, kind: "not_found" }, { itemId: epic.id, kind: "not_found" }], [ign, epic], []);

    expect(joined[1]).toMatchObject({ joinItemId: ign.id });
  });

  it("una fila de otra tanda se suma al juego a revisar abierto que espera respuesta", () => {
    const open = waiting("Fortnite", [ignItem("Fortnite", { matchState: "candidates", candidates: FORTNITES })]);
    const epic = playniteItem("Fortnite", EPIC, "Fortnite", { matchState: "pending" });

    const joined = joinSameName([candidates(epic)], [epic], [open]);

    expect(joined).toEqual([{ ...candidates(epic), joinEntryId: open.id }]);
  });

  it.each([
    ["excluido", { answers: { excluded: true } }],
    ["cargado a mano", { answers: { manualTitle: "Fortnite" } }],
  ])("no se suma a uno ya respondido: %s", (_name, options) => {
    const open = waiting("Fortnite", [ignItem("Fortnite", { matchState: "not_found" })], options);
    const epic = playniteItem("Fortnite", EPIC, "Fortnite", { matchState: "pending" });

    const joined = joinSameName([candidates(epic)], [epic], [open]);

    expect(joined).toEqual([candidates(epic)]);
  });

  it("no se suma a uno con un candidato ya elegido", () => {
    const chosen = ignItem("Fortnite", { matchState: "candidates", candidates: FORTNITES, chosenIgdbId: 1 });
    const open = entry("Fortnite", [chosen], { igdbId: 1 });
    const epic = playniteItem("Fortnite", EPIC, "Fortnite", { matchState: "pending" });

    const joined = joinSameName([candidates(epic)], [epic], [open]);

    expect(joined).toEqual([candidates(epic)]);
  });

  it("lo que no es un juego no se junta", () => {
    const steam = playniteItem("Cuphead Demo", EPIC, "demo-1", { matchState: "pending" });
    const other = playniteItem("Cuphead Demo", EPIC, "demo-2", { matchState: "pending" });
    const matches: ItemMatch[] = [
      { itemId: steam.id, kind: "not_found", notAGame: true },
      { itemId: other.id, kind: "not_found", notAGame: true },
    ];

    const joined = joinSameName(matches, [steam, other], []);

    expect(joined).toEqual(matches);
  });

  it("nombres distintos quedan separados", () => {
    const crash = ignItem("Crash Bandicoot", { matchState: "pending" });
    const spyro = ignItem("Spyro", { matchState: "pending" });

    const joined = joinSameName([candidates(crash), candidates(spyro)], [crash, spyro], []);

    expect(joined).toEqual([candidates(crash), candidates(spyro)]);
  });

  it("un cruce que salió bien no se toca", () => {
    const hades = ignItem("Hades", { matchState: "pending" });
    const matched: ItemMatch = { itemId: hades.id, kind: "absorbed", baseItemId: null };

    const joined = joinSameName([matched], [hades], []);

    expect(joined).toEqual([matched]);
  });
});

describe("awaitsIdentity", () => {
  it("espera respuesta un juego a revisar sin cruce ni decisiones", () => {
    const open = waiting("Viejo", [ignItem("Viejo", { matchState: "not_found" })]);

    const awaiting = awaitsIdentity(open);

    expect(awaiting).toBe(true);
  });

  it("uno con el tipo de copia elegido ya tiene una respuesta", () => {
    const open = waiting("Viejo", [playniteItem("Viejo", EPIC, "viejo", { matchState: "not_found", copyKind: "purchased" })]);

    const awaiting = awaitsIdentity(open);

    expect(awaiting).toBe(false);
  });

  it("lo que no es un juego, traído con «Volver a revisar», no espera a otro con su nombre", () => {
    const open = waiting("Cuphead Demo", [playniteItem("Cuphead Demo", EPIC, "demo", { matchState: "not_found" })]);

    const awaiting = awaitsIdentity(open);

    expect(awaiting).toBe(false);
  });
});

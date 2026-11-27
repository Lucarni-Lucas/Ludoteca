import { describe, expect, it } from "vitest";

import { clearedFilters, filterLibrary, hasActiveFilters, type LibraryFilters, NO_FILTERS } from "@/model/game/filters";
import { parseLibraryView, serializeLibraryView } from "@/model/game/filter-params";
import type { LibraryGame } from "@/model/game/library-game";
import { countLibraryOptions } from "@/model/game/summary";

import { buildGame, statusByKey } from "./library-fixtures";

function titles(games: readonly LibraryGame[], filters: Partial<LibraryFilters>): readonly string[] {
  return filterLibrary(games, { ...NO_FILTERS, ...filters }).map(({ title }) => title);
}

const ENDLESS = { estimatedHours: null, endless: true, coverUrl: null };
const rocket = buildGame({ title: "Rocket League", status: statusByKey("played"), corrections: ENDLESS });
const hades = buildGame({ title: "Hades", status: statusByKey("completed"), hundredPercent: true });
const hollow = buildGame({ title: "Hollow Knight", status: statusByKey("completed") });
const hidden = buildGame({ title: "8BitMMO", hidden: true });

describe("filtro «Ocultos»", () => {
  it("Solo ocultos", () => {
    const games = [hidden, hades];

    const result = titles(games, { hidden: "only" });

    expect(result).toEqual(["8BitMMO"]);
  });

  it("«Solo ocultos» cuenta solo los ocultos", () => {
    const games = [hidden, hades, hollow];

    const counts = countLibraryOptions(games, "only");

    expect(counts.total).toBe(1);
  });

  it("«Solo ocultos» cuenta como filtro, y «Limpiar» lo vuelve a «No mostrar»", () => {
    const filters = { ...NO_FILTERS, hidden: "only" as const };

    const cleared = clearedFilters(filters);

    expect(hasActiveFilters(filters)).toBe(true);
    expect(cleared.hidden).toBe("exclude");
  });

  it("«Limpiar» conserva «Mostrar ocultos»", () => {
    const filters = { ...NO_FILTERS, hidden: "include" as const, storeIds: ["steam"] };

    const cleared = clearedFilters(filters);

    expect(cleared).toEqual({ ...NO_FILTERS, hidden: "include" });
  });
});

describe("filtro por marcas", () => {
  it("Solo los sin fin", () => {
    const games = [rocket, hades, hollow];

    const result = titles(games, { marks: ["endless"] });

    expect(result).toEqual(["Rocket League"]);
  });

  it("Completados al 100%", () => {
    const games = [rocket, hades, hollow];

    const result = titles(games, { groups: ["finished"], marks: ["hundred_percent"] });

    expect(result).toEqual(["Hades"]);
  });

  it("varias marcas valen como «cualquiera de ellas»", () => {
    const games = [rocket, hades, hollow];

    const result = titles(games, { marks: ["endless", "hundred_percent"] });

    expect(result).toEqual(["Rocket League", "Hades"]);
  });

  it("cuenta los juegos de cada marca", () => {
    const games = [rocket, hades, hollow];

    const counts = countLibraryOptions(games, "exclude");

    expect(counts.marks).toEqual({ endless: 1, hundred_percent: 1 });
  });

  it("un filtro de marcas activo cuenta para «Limpiar»", () => {
    const filters = { ...NO_FILTERS, marks: ["endless" as const] };

    const active = hasActiveFilters(filters);

    expect(active).toBe(true);
  });
});

describe("la URL de los dos filtros", () => {
  it.each([
    { hidden: "exclude" as const, marks: [] as const, search: "" },
    { hidden: "include" as const, marks: ["endless"] as const, search: "hidden=1&marcas=sin-fin" },
    { hidden: "only" as const, marks: ["endless", "hundred_percent"] as const, search: "hidden=solo&marcas=sin-fin%2C100" },
  ])("ida y vuelta con «$search»", ({ hidden: mode, marks, search }) => {
    const view = { filters: { ...NO_FILTERS, hidden: mode, marks }, sort: "recent" as const };

    const serialized = serializeLibraryView(view);

    expect(serialized).toBe(search);
    expect(parseLibraryView(serialized).filters).toMatchObject({ hidden: mode, marks });
  });

  it("ignora una marca que no existe", () => {
    const view = parseLibraryView("?marcas=sin-fin,otra");

    expect(view.filters.marks).toEqual(["endless"]);
  });
});

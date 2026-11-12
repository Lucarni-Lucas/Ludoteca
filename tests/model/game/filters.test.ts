import { describe, expect, it } from "vitest";

import { filterLibrary, hasActiveFilters, type LibraryFilters, NO_FILTERS } from "@/model/game/filters";
import type { LibraryGame } from "@/model/game/library-game";
import { normalizeText } from "@/model/game/normalize-text";

import { buildCopy, buildGame, statusByKey } from "./library-fixtures";

function titles(games: readonly LibraryGame[], filters: Partial<LibraryFilters>): readonly string[] {
  return filterLibrary(games, { ...NO_FILTERS, ...filters }).map(({ title }) => title);
}

function withHours(title: string, estimatedHours: number | null, endless = false): LibraryGame {
  return buildGame({ title, catalog: { estimatedHours, endless, coverUrl: null } });
}

function withPlayed(title: string, minutes: number): LibraryGame {
  return buildGame({ title, copies: [buildCopy({ playtimeMinutes: minutes })] });
}

const abandoned = buildGame({ title: "Abandonado", status: statusByKey("abandoned") });
const tried = buildGame({ title: "Probado", status: statusByKey("tried") });
const wishlist = buildGame({ title: "Deseado", status: statusByKey("wishlist") });
const backlog = buildGame({ title: "Pendiente", status: statusByKey("backlog") });
const playing = buildGame({ title: "Jugando", status: statusByKey("playing") });

describe("filtro por estado", () => {
  const games = [abandoned, tried, wishlist, backlog, playing];

  it("Grupo entero", () => {
    const filters = { groups: ["dropped"] as const };

    const result = titles(games, filters);

    expect(result).toEqual(["Abandonado", "Probado"]);
  });

  it("Varios estados", () => {
    const filters = { statusIds: ["wishlist", "backlog"] };

    const result = titles(games, filters);

    expect(result).toEqual(["Deseado", "Pendiente"]);
  });

  it("suma un grupo con un estado de otro grupo", () => {
    const filters = { groups: ["dropped"] as const, statusIds: ["playing"] };

    const result = titles(games, filters);

    expect(result).toEqual(["Abandonado", "Probado", "Jugando"]);
  });
});

describe("filtros combinados", () => {
  it("Tienda y estado", () => {
    const steamFinished = buildGame({
      title: "Terminado en Steam",
      status: statusByKey("completed"),
      copies: [buildCopy()],
    });
    const epicFinished = buildGame({
      title: "Terminado en Epic",
      status: statusByKey("completed"),
      copies: [buildCopy({ storeId: "epic", storeName: "Epic Games" })],
    });
    const steamBacklog = buildGame({ title: "Pendiente en Steam", copies: [buildCopy()] });

    const result = titles([steamFinished, epicFinished, steamBacklog], { storeIds: ["steam"], groups: ["finished"] });

    expect(result).toEqual(["Terminado en Steam"]);
  });

  it("evalúa tienda y tipo por separado sobre las copias", () => {
    const civilization = buildGame({
      title: "Civilization VI",
      copies: [buildCopy({ storeId: "epic", kind: "free" }), buildCopy({ storeId: "steam", kind: "purchased" })],
    });

    const result = titles([civilization], { storeIds: ["steam"], kinds: ["free"] });

    expect(result).toEqual(["Civilization VI"]);
  });

  it("varias tiendas muestran los juegos de cualquiera", () => {
    const steam = buildGame({ title: "En Steam", copies: [buildCopy()] });
    const gog = buildGame({ title: "En GOG", copies: [buildCopy({ storeId: "gog" })] });
    const epic = buildGame({ title: "En Epic", copies: [buildCopy({ storeId: "epic" })] });

    const result = titles([steam, gog, epic], { storeIds: ["steam", "gog"] });

    expect(result).toEqual(["En Steam", "En GOG"]);
  });

  it("la tienda también cuenta las copias perdidas", () => {
    const game = buildGame({ title: "Perdido", copies: [buildCopy({ lostAt: "2026-01-01" })] });

    const result = titles([game], { storeIds: ["steam"] });

    expect(result).toEqual(["Perdido"]);
  });
});

describe("rango de duración", () => {
  const games = [withHours("Dos", 2), withHours("Tres", 3), withHours("Ocho", 8), withHours("Nueve", 9)];

  it("Rango libre", () => {
    const filters = { duration: { min: 3, max: 8 } };

    const result = titles(games, filters);

    expect(result).toEqual(["Tres", "Ocho"]);
  });

  it("acepta un rango con un solo extremo", () => {
    const filters = { duration: { min: 8, max: null } };

    const result = titles(games, filters);

    expect(result).toEqual(["Ocho", "Nueve"]);
  });

  it("Juegos sin fin", () => {
    const candidates = [withHours("Con duración", 5), withHours("Sin fin", 5, true), withHours("Desconocida", null)];

    const result = titles(candidates, { duration: { min: 0, max: 100 } });

    expect(result).toEqual(["Con duración"]);
  });
});

describe("rango de horas jugadas", () => {
  it("Sin abrir", () => {
    const unopened = buildGame({ title: "Sin abrir", copies: [buildCopy({ playtimeMinutes: 0 })] });
    const opened = withPlayed("Abierto", 90);
    const notOwned = buildGame({ title: "Sin copias" });

    const result = titles([unopened, opened, notOwned], { played: { min: 0, max: 0 } });

    expect(result).toEqual(["Sin abrir"]);
  });

  it("Juegos sin fin incluidos", () => {
    const endless = buildGame({
      title: "Sin fin",
      catalog: { estimatedHours: null, endless: true, coverUrl: null },
      copies: [buildCopy({ playtimeMinutes: 25 * 60 })],
    });
    const short = withPlayed("Corto", 60);

    const result = titles([endless, short], { played: { min: 20, max: null } });

    expect(result).toEqual(["Sin fin"]);
  });

  it("suma las horas de todas las copias", () => {
    const game = buildGame({
      title: "Dos copias",
      copies: [buildCopy({ playtimeMinutes: 60 }), buildCopy({ storeId: "gog", playtimeMinutes: 90 })],
    });

    const result = titles([game], { played: { min: 2.5, max: 2.5 } });

    expect(result).toEqual(["Dos copias"]);
  });
});

describe("rango de puntaje", () => {
  it("Puntaje alto", () => {
    const high = buildGame({ title: "Alto", score: 9 });
    const low = buildGame({ title: "Bajo", score: 8.9 });
    const unrated = buildGame({ title: "Sin puntaje" });

    const result = titles([high, low, unrated], { score: { min: 9, max: null } });

    expect(result).toEqual(["Alto"]);
  });

  it("un 0.0 cumple un rango que empieza en 0", () => {
    const zero = buildGame({ title: "Cero", score: 0 });

    const result = titles([zero], { score: { min: 0, max: 5 } });

    expect(result).toEqual(["Cero"]);
  });
});

describe("filtro por tipo de copia", () => {
  it("Ya no lo tengo", () => {
    const lost = buildGame({ title: "Perdido", copies: [buildCopy({ lostAt: "2026-01-01", lostReason: "sold" })] });
    const owned = buildGame({ title: "Vigente", copies: [buildCopy()] });

    const result = titles([lost, owned], { kinds: ["lost"] });

    expect(result).toEqual(["Perdido"]);
  });

  it("un tipo cuenta solo las copias vigentes", () => {
    const lost = buildGame({ title: "Perdido", copies: [buildCopy({ kind: "free", lostAt: "2026-01-01" })] });

    const result = titles([lost], { kinds: ["free"] });

    expect(result).toEqual([]);
  });
});

describe("búsqueda por título", () => {
  it("Búsqueda parcial", () => {
    const games = [buildGame({ title: "Civilization VI" }), buildGame({ title: "Hades" })];

    const result = titles(games, { title: "civ" });

    expect(result).toEqual(["Civilization VI"]);
  });

  it("no distingue acentos ni mayúsculas", () => {
    const games = [buildGame({ title: "Pokémon Rojo" })];

    const result = titles(games, { title: "POKEMON" });

    expect(result).toEqual(["Pokémon Rojo"]);
  });
});

describe("juegos «Sin interés»", () => {
  const hidden = buildGame({ title: "Oculto", notInterested: true });
  const shown = buildGame({ title: "Visible" });

  it("no aparecen por defecto", () => {
    const games = [hidden, shown];

    const result = titles(games, {});

    expect(result).toEqual(["Visible"]);
  });

  it("aparecen con «Mostrar sin interés»", () => {
    const games = [hidden, shown];

    const result = titles(games, { showNotInterested: true });

    expect(result).toEqual(["Oculto", "Visible"]);
  });
});

describe("normalizeText", () => {
  it("saca acentos, mayúsculas y espacios de los bordes", () => {
    const text = "  Ñandú ÉPICO ";

    const normalized = normalizeText(text);

    expect(normalized).toBe("nandu epico");
  });
});

describe("hasActiveFilters", () => {
  it("no cuenta «Mostrar sin interés» como filtro para limpiar", () => {
    const filters = { ...NO_FILTERS, showNotInterested: true };

    const active = hasActiveFilters(filters);

    expect(active).toBe(false);
  });

  it("detecta un rango con un solo extremo", () => {
    const filters = { ...NO_FILTERS, score: { min: 9, max: null } };

    const active = hasActiveFilters(filters);

    expect(active).toBe(true);
  });
});

describe("filtro por tipo Otro", () => {
  it("Tipo Otro", () => {
    const gift = buildGame({ title: "Celeste", copies: [buildCopy({ kind: "other", kindDetail: "Regalo" })] });
    const other = buildGame({ title: "Hades", copies: [buildCopy({ kind: "other" })] });
    const purchased = buildGame({ title: "Outer Wilds", copies: [buildCopy()] });

    const result = titles([gift, other, purchased], { kinds: ["other"] });

    expect(result).toEqual(["Celeste", "Hades"]);
  });

  it("una copia Otro perdida no cuenta como Otro", () => {
    const lost = buildGame({ title: "Celeste", copies: [buildCopy({ kind: "other", lostAt: "2026-01-01" })] });

    const result = titles([lost], { kinds: ["other"] });

    expect(result).toEqual([]);
  });
});

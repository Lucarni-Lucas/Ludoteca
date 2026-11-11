import { describe, expect, it } from "vitest";

import { sortLibrary } from "@/model/game/sort";
import {
  countLibraryOptions,
  gamesCountText,
  listStoreOptions,
  summarizeLibrary,
  summaryText,
} from "@/model/game/summary";

import { buildCopy, buildGame, statusByKey } from "./library-fixtures";

describe("sortLibrary", () => {
  it("Orden por puntaje", () => {
    const games = [
      buildGame({ title: "Sin puntaje" }),
      buildGame({ title: "Cero", score: 0 }),
      buildGame({ title: "Alto", score: 9.5 }),
    ];

    const sorted = sortLibrary(games, "score");

    expect(sorted.map(({ title }) => title)).toEqual(["Alto", "Cero", "Sin puntaje"]);
  });

  it("Orden por duración", () => {
    const hours = (estimatedHours: number | null, endless = false) => ({ estimatedHours, endless, coverUrl: null });
    const games = [
      buildGame({ title: "Desconocida", catalog: hours(null) }),
      buildGame({ title: "Sin fin", catalog: hours(null, true) }),
      buildGame({ title: "Larga", catalog: hours(40) }),
      buildGame({ title: "Corta", catalog: hours(3) }),
    ];

    const sorted = sortLibrary(games, "duration");

    expect(sorted.map(({ title }) => title).slice(0, 2)).toEqual(["Corta", "Larga"]);
  });

  it("por defecto muestra primero los agregados recientemente", () => {
    const games = [
      buildGame({ title: "Viejo", addedAt: "2026-01-01T00:00:00.000Z" }),
      buildGame({ title: "Nuevo", addedAt: "2026-06-01T00:00:00.000Z" }),
    ];

    const sorted = sortLibrary(games, "recent");

    expect(sorted.map(({ title }) => title)).toEqual(["Nuevo", "Viejo"]);
  });

  it("ordena por título sin distinguir acentos", () => {
    const games = [buildGame({ title: "Zelda" }), buildGame({ title: "Ábaco" }), buildGame({ title: "Bastion" })];

    const sorted = sortLibrary(games, "title");

    expect(sorted.map(({ title }) => title)).toEqual(["Ábaco", "Bastion", "Zelda"]);
  });

  it("ordena por horas jugadas y deja al final los juegos sin copias", () => {
    const games = [
      buildGame({ title: "Sin copias" }),
      buildGame({ title: "Poco", copies: [buildCopy({ playtimeMinutes: 60 })] }),
      buildGame({ title: "Mucho", copies: [buildCopy({ playtimeMinutes: 600 })] }),
    ];

    const sorted = sortLibrary(games, "played");

    expect(sorted.map(({ title }) => title)).toEqual(["Mucho", "Poco", "Sin copias"]);
  });

  it("no cambia la lista original", () => {
    const games = [buildGame({ title: "B" }), buildGame({ title: "A" })];

    sortLibrary(games, "title");

    expect(games.map(({ title }) => title)).toEqual(["B", "A"]);
  });
});

describe("summarizeLibrary", () => {
  it("Resumen", () => {
    const owned = Array.from({ length: 14 }, (_, index) =>
      buildGame({ copies: [buildCopy({ storeId: `tienda-${index % 7}` })] }),
    );
    const wished = buildGame({ status: statusByKey("wishlist") });
    const lost = buildGame({ copies: [buildCopy({ lostAt: "2026-01-01" })] });

    const summary = summarizeLibrary([...owned, wished, lost]);

    expect(summaryText(summary)).toBe("14 juegos en 7 tiendas · 1 en «Quiero jugarlo» · 1 que ya no tenés");
  });

  it("usa el singular cuando hay un solo juego en una sola tienda", () => {
    const games = [buildGame({ copies: [buildCopy()] })];

    const summary = summarizeLibrary(games);

    expect(summaryText(summary)).toBe("1 juego en 1 tienda · 0 en «Quiero jugarlo» · 0 que ya no tenés");
  });

  it("un juego sin copias no suma a los juegos ni a los perdidos", () => {
    const games = [buildGame()];

    const summary = summarizeLibrary(games);

    expect(summary).toEqual({ games: 0, stores: 0, wishlist: 0, lost: 0 });
  });

  it("no cuenta los «Sin interés»", () => {
    const games = [
      buildGame({ notInterested: true, copies: [buildCopy()] }),
      buildGame({ notInterested: true, status: statusByKey("wishlist") }),
    ];

    const summary = summarizeLibrary(games);

    expect(summary).toEqual({ games: 0, stores: 0, wishlist: 0, lost: 0 });
  });
});

describe("countLibraryOptions", () => {
  it("cuenta cada juego una sola vez por opción, aunque tenga dos copias iguales", () => {
    const games = [buildGame({ copies: [buildCopy(), buildCopy({ id: "otra" })] })];

    const counts = countLibraryOptions(games, false);

    expect(counts.stores.steam).toBe(1);
    expect(counts.kinds.purchased).toBe(1);
  });

  it("separa las copias vigentes de las perdidas", () => {
    const games = [buildGame({ copies: [buildCopy({ kind: "free", lostAt: "2026-01-01" })] })];

    const counts = countLibraryOptions(games, false);

    expect(counts.kinds.free).toBe(0);
    expect(counts.kinds.lost).toBe(1);
  });

  it("deja afuera a los «Sin interés» salvo que se muestren", () => {
    const games = [buildGame({ notInterested: true }), buildGame()];

    const hidden = countLibraryOptions(games, false);
    const shown = countLibraryOptions(games, true);

    expect(hidden.statuses.backlog).toBe(1);
    expect(shown.statuses.backlog).toBe(2);
  });

  it("agrupa por grupo de estado", () => {
    const games = [buildGame({ status: statusByKey("abandoned") }), buildGame({ status: statusByKey("tried") })];

    const counts = countLibraryOptions(games, false);

    expect(counts.groups.dropped).toBe(2);
  });
});

describe("listStoreOptions", () => {
  it("lista cada tienda una vez y ordenada por nombre", () => {
    const games = [
      buildGame({ copies: [buildCopy(), buildCopy({ storeId: "gog", storeName: "GOG" })] }),
      buildGame({ copies: [buildCopy()] }),
    ];

    const options = listStoreOptions(games);

    expect(options.map(({ name }) => name)).toEqual(["GOG", "Steam"]);
  });
});

describe("gamesCountText", () => {
  it.each([
    { count: 1, expected: "Ver 1 juego" },
    { count: 5, expected: "Ver 5 juegos" },
    { count: 0, expected: "Ver 0 juegos" },
  ])("$count da «$expected»", ({ count, expected }) => {
    const value = count;

    const text = gamesCountText(value);

    expect(text).toBe(expected);
  });
});

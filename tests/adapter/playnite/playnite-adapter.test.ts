import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readPlayniteExport } from "@/adapter/playnite/playnite-adapter";

type Sample = { schemaVersion: number; generator: { name: string }; games: Record<string, unknown>[] };

const SAMPLE = JSON.parse(
  readFileSync(path.resolve("tests/adapter/playnite/playnite-export-sample.json"), "utf8"),
) as Sample;

function exportWith(games: Record<string, unknown>[], overrides: Partial<Sample> = {}) {
  return { ...SAMPLE, games, ...overrides };
}

function game(overrides: Record<string, unknown>) {
  return { name: "Juego", sourceName: "Epic", providerGameId: "juego", playtimeSeconds: 0, releaseDate: "2020-1-1", ...overrides };
}

function readOne(overrides: Record<string, unknown>) {
  return readPlayniteExport(exportWith([game(overrides)]))?.rows[0];
}

describe("readPlayniteExport", () => {
  it("lee los juegos de la muestra con su tienda y su ID en la tienda", () => {
    const content = SAMPLE;

    const read = readPlayniteExport(content);

    expect(read?.source).toBe("playnite");
    expect(read?.rows).toHaveLength(9);
    expect(read?.rows[0]).toEqual({
      source: "playnite",
      sourceKey: "epic-games:9d2d0eb64d5c44529cece33fe2a46482",
      title: "Grand Theft Auto V",
      altTitles: [],
      year: 2013,
      storeName: "Epic Games",
      storeGameId: "9d2d0eb64d5c44529cece33fe2a46482",
      playtimeMinutes: 91,
      ignStatuses: [],
      ignScore: null,
      hltbMainHours: null,
      steamAppId: null,
    });
  });

  it("conserva un ID de Epic con palabras", () => {
    const content = SAMPLE;

    const rocketLeague = readPlayniteExport(content)?.rows.find((row) => row.title === "Rocket League");

    expect(rocketLeague).toMatchObject({ storeGameId: "Sugar", sourceKey: "epic-games:Sugar", playtimeMinutes: 600 });
  });

  it.each([
    ["Epic", "Epic Games"],
    ["Steam", "Steam"],
    ["GOG", "GOG"],
    ["itch.io", "itch.io"],
    ["Tienda Rara", "Tienda Rara"],
  ])("la tienda %s pasa como %s", (sourceName, storeName) => {
    const overrides = { sourceName };

    const row = readOne(overrides);

    expect(row?.storeName).toBe(storeName);
  });

  it("redondea los minutos jugados", () => {
    const rows = [readOne({ playtimeSeconds: 89 }), readOne({ playtimeSeconds: 91 }), readOne({ playtimeSeconds: 0 })];

    const minutes = rows.map((row) => row?.playtimeMinutes);

    expect(minutes).toEqual([1, 2, 0]);
  });

  it("deja vacías las horas de Steam, que Playnite sin sesión siempre da en 0", () => {
    const content = SAMPLE;

    const steam = readPlayniteExport(content)?.rows.filter((row) => row.storeName === "Steam");

    expect(steam?.map((row) => [row.title, row.storeGameId, row.playtimeMinutes])).toEqual([
      ["Celeste", "504230", null],
      ["Portal 2", "620", null],
    ]);
  });

  it("toma el año de una fecha sin ceros, y sin fecha queda vacío", () => {
    const rows = [readOne({ releaseDate: "2020-4-23" }), readOne({ releaseDate: undefined }), readOne({ releaseDate: "" })];

    const years = rows.map((row) => row?.year);

    expect(years).toEqual([2020, null, null]);
  });

  it("saltea y cuenta las filas sin tienda o sin ID en la tienda", () => {
    const games = [game({}), game({ sourceName: null }), game({ providerGameId: "" }), game({ sourceName: undefined })];

    const read = readPlayniteExport(exportWith(games));

    expect(read?.rows).toHaveLength(1);
    expect(read?.skipped).toBe(3);
  });

  it("lee un juego oculto como cualquier otro", () => {
    const content = SAMPLE;

    const beta = readPlayniteExport(content)?.rows.find((row) => row.title === "Barony (Beta)");

    expect(beta).toMatchObject({ storeName: "Epic Games", playtimeMinutes: 30 });
  });

  it("otra schemaVersion no se reconoce", () => {
    const content = exportWith(SAMPLE.games, { schemaVersion: 2 });

    const read = readPlayniteExport(content);

    expect(read).toBeNull();
  });

  it("otro exportador no se reconoce", () => {
    const content = exportWith(SAMPLE.games, { generator: { name: "Otro exportador" } });

    const read = readPlayniteExport(content);

    expect(read).toBeNull();
  });

  it("un export de IGN no se reconoce como Playnite", () => {
    const ign = { records: [{ ignId: "1", name: "Hades", status: "beat", flags: [] }] };

    const read = readPlayniteExport(ign);

    expect(read).toBeNull();
  });
});

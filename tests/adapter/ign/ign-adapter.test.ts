import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { readIgnExport } from "@/adapter/ign/ign-adapter";

const SAMPLE = JSON.parse(readFileSync(path.resolve("tests/adapter/ign/ign-export-sample.json"), "utf8")) as {
  records: Record<string, unknown>[];
};

function record(overrides: Record<string, unknown>) {
  return { ignId: "id-1", name: "Juego", status: null, flags: [], ...overrides };
}

function readOne(overrides: Record<string, unknown>) {
  const read = readIgnExport({ records: [record(overrides)] });
  return read?.rows[0];
}

describe("readIgnExport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Archivo de IGN", () => {
    const content = SAMPLE;

    const read = readIgnExport(content);

    expect(read?.source).toBe("ign");
    expect(read?.rows).toHaveLength(9);
    expect(read?.skipped).toBe(0);
  });

  it("lee cada juego con su título, alternativos, año y puntaje", () => {
    const content = SAMPLE;

    const read = readIgnExport(content);

    expect(read?.rows[0]).toEqual({
      source: "ign",
      sourceKey: "00000000-0000-4000-8000-000000000001",
      title: "20 Minutes Till Dawn",
      altTitles: ["Twenty Minutes Till Dawn"],
      year: 2022,
      storeName: null,
      storeGameId: null,
      playtimeMinutes: null,
      ignStatuses: ["quit"],
      ignScore: 5,
      hltbMainHours: 3.7,
      steamAppId: "1966900",
    });
  });

  it("lee los estados de toda la muestra, también los de dos estados, paused y wishlist", () => {
    const content = SAMPLE;

    const statuses = readIgnExport(content)?.rows.map((row) => [row.title, row.ignStatuses]);

    expect(statuses).toEqual([
      ["20 Minutes Till Dawn", ["quit"]],
      ["60 Seconds!", ["beat"]],
      ["8BitMMO", ["backlog"]],
      ["Among Us", ["beat"]],
      ["Overwatch", ["beat", "quit"]],
      ["Crash Bandicoot", ["beat"]],
      ["Celeste", ["playing"]],
      ["Cartas del Faro", ["paused"]],
      ["Bruma Eterna", ["wishlist"]],
    ]);
  });

  it.each(["playing", "paused", "backlog", "beat", "quit", "wishlist"])("lee el status %s", (status) => {
    const overrides = { status };

    const row = readOne(overrides);

    expect(row?.ignStatuses).toEqual([status]);
  });

  it.each([
    ["playing", "playing"],
    ["paused", "paused"],
    ["backlog", "backlog"],
    ["completed", "beat"],
    ["archived", "quit"],
    ["wishlist", "wishlist"],
  ])("lee el flag %s como %s", (flag, expected) => {
    const overrides = { flags: [flag] };

    const row = readOne(overrides);

    expect(row?.ignStatuses).toEqual([expected]);
  });

  it("ignora un estado desconocido y lo avisa en el log", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const row = readOne({ status: "beat", flags: ["favorito"] });

    expect(row?.ignStatuses).toEqual(["beat"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("IGN"), expect.objectContaining({ unknown: ["favorito"] }));
  });

  it("toma hltb[0] como la duración principal", () => {
    const overrides = { hltb: [2.3, 6.8, 28.6] };

    const row = readOne(overrides);

    expect(row?.hltbMainHours).toBeCloseTo(2.3, 5);
  });

  it("sin duración de HowLongToBeat, o con la principal vacía, queda vacía", () => {
    const rows = [readOne({ hltb: null }), readOne({ hltb: [null, 5, 10] })];

    const hours = rows.map((row) => row?.hltbMainHours);

    expect(hours).toEqual([null, null]);
  });

  it("el steamId sirve para cruzar pero no es una copia", () => {
    const overrides = { steamId: 1966900 };

    const row = readOne(overrides);

    expect(row).toMatchObject({ steamAppId: "1966900", storeName: null, storeGameId: null, playtimeMinutes: null });
  });

  it("un JSON de Playnite no se reconoce como IGN", () => {
    const playnite = {
      generator: { name: "Playnite Library Exporter", version: "1.0" },
      schemaVersion: 1,
      games: [{ name: "Hades", sourceName: "Epic", providerGameId: "hades" }],
    };

    const read = readIgnExport(playnite);

    expect(read).toBeNull();
  });

  it.each([null, "texto", [], { records: [{ name: "Sin ignId" }] }])("no reconoce %j", (content) => {
    const value = content;

    const read = readIgnExport(value);

    expect(read).toBeNull();
  });
});

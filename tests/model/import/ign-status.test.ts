import { describe, expect, it } from "vitest";

import { readIgnStatuses, scoreFromIgn, suggestIgnStatus } from "@/model/import/ign-status";

describe("readIgnStatuses", () => {
  it("junta el status y los flags sin repetir el mismo estado", () => {
    const status = "beat";

    const read = readIgnStatuses(status, ["completed"]);

    expect(read).toEqual({ statuses: ["beat"], unknown: [] });
  });

  it("lee Beat y Quit cuando los flags nombran dos estados", () => {
    const flags = ["completed", "archived"];

    const read = readIgnStatuses("beat", flags);

    expect(read.statuses).toEqual(["beat", "quit"]);
  });

  it("lee solo Quit cuando el status es quit y el flag archived", () => {
    const flags = ["archived"];

    const read = readIgnStatuses("quit", flags);

    expect(read.statuses).toEqual(["quit"]);
  });

  it.each([
    ["playing", "playing"],
    ["paused", "paused"],
    ["backlog", "backlog"],
    ["completed", "beat"],
    ["archived", "quit"],
    ["wishlist", "wishlist"],
  ] as const)("el flag %s es %s", (flag, expected) => {
    const flags = [flag];

    const read = readIgnStatuses(null, flags);

    expect(read.statuses).toEqual([expected]);
  });

  it("lee paused desde los flags aunque el status sea otro", () => {
    const flags = ["paused"];

    const read = readIgnStatuses("playing", flags);

    expect(read.statuses).toEqual(["playing", "paused"]);
  });

  it("ignora un valor desconocido y lo devuelve aparte", () => {
    const flags = ["favorite", "constructor"];

    const read = readIgnStatuses("dropped", flags);

    expect(read).toEqual({ statuses: [], unknown: ["dropped", "favorite", "constructor"] });
  });
});

describe("suggestIgnStatus", () => {
  it("Backlog con copia", () => {
    const statuses = ["backlog"] as const;

    const suggestion = suggestIgnStatus(statuses, true);

    expect(suggestion).toEqual({ kind: "single", statusKey: "backlog" });
  });

  it("Backlog sin copia", () => {
    const statuses = ["backlog"] as const;

    const suggestion = suggestIgnStatus(statuses, false);

    expect(suggestion).toEqual({ kind: "single", statusKey: "wishlist" });
  });

  it("Wishlist de IGN", () => {
    const statuses = ["wishlist"] as const;

    const suggestion = suggestIgnStatus(statuses, true);

    expect(suggestion).toEqual({ kind: "single", statusKey: "wishlist" });
  });

  it("Dos estados a la vez", () => {
    const { statuses } = readIgnStatuses("beat", ["completed", "archived"]);

    const suggestion = suggestIgnStatus(statuses, true);

    expect(suggestion).toEqual({ kind: "conflict", statusKeys: ["completed", "abandoned"] });
  });

  it.each([
    ["playing", "playing"],
    ["paused", "paused"],
    ["beat", "completed"],
    ["quit", "abandoned"],
  ] as const)("%s pasa al estado %s", (status, expected) => {
    const statuses = [status];

    const suggestion = suggestIgnStatus(statuses, false);

    expect(suggestion).toEqual({ kind: "single", statusKey: expected });
  });

  it("sin estados de IGN no sugiere nada", () => {
    const statuses: readonly [] = [];

    const suggestion = suggestIgnStatus(statuses, true);

    expect(suggestion).toEqual({ kind: "none" });
  });
});

describe("scoreFromIgn", () => {
  it("Puntaje entero", () => {
    const score = 8;

    const suggested = scoreFromIgn(score);

    expect(suggested).toBe(8);
    expect(suggested?.toFixed(1)).toBe("8.0");
  });

  it("sin puntaje queda sin puntaje", () => {
    const score = null;

    const suggested = scoreFromIgn(score);

    expect(suggested).toBeNull();
  });

  it.each([-1, 11, Number.NaN])("un puntaje fuera de rango (%s) queda sin puntaje", (score) => {
    const value = score;

    const suggested = scoreFromIgn(value);

    expect(suggested).toBeNull();
  });
});

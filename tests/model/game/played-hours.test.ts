import { describe, expect, it } from "vitest";

import { PlayedHoursOutOfRangeError } from "@/model/game/errors";
import { filterLibrary, NO_FILTERS } from "@/model/game/filters";
import { hasPlayedHours, playedHours } from "@/model/game/library-game";
import { playedMinutesFromHours } from "@/model/game/played-hours";
import { sortLibrary } from "@/model/game/sort";

import { buildCopy, buildGame } from "./library-fixtures";

describe("playedMinutesFromHours", () => {
  it.each([
    { description: "pasa horas con un decimal a minutos exactos", hours: 12.5, expected: 750 },
    { description: "acepta 0 horas", hours: 0, expected: 0 },
    { description: "redondea a un decimal", hours: 12.46, expected: 750 },
  ])("$description", ({ hours, expected }) => {
    const value = hours;

    const minutes = playedMinutesFromHours(value);

    expect(minutes).toBe(expected);
  });

  it("vacío es sin total a mano", () => {
    const hours = null;

    const minutes = playedMinutesFromHours(hours);

    expect(minutes).toBeNull();
  });

  it("Horas negativas", () => {
    const hours = -3;

    const convert = () => playedMinutesFromHours(hours);

    expect(convert).toThrow(PlayedHoursOutOfRangeError);
    expect(convert).toThrow("Poné las horas jugadas, de 0 en adelante");
  });

  it.each([-0.1, 100_000, Number.NaN])("rechaza %s", (hours) => {
    const value = hours;

    const convert = () => playedMinutesFromHours(value);

    expect(convert).toThrow(PlayedHoursOutOfRangeError);
  });
});

describe("playedHours con el total a mano", () => {
  it("Cargar las horas en la ficha: el total a mano manda sobre las copias", () => {
    const game = buildGame({ manualPlayedMinutes: 70 * 60, copies: [buildCopy({ playtimeMinutes: 120 })] });

    const hours = playedHours(game);

    expect(hours).toBe(70);
  });

  it("Borrar las horas: sin total a mano vuelve a la suma de las copias", () => {
    const game = buildGame({ manualPlayedMinutes: null, copies: [buildCopy({ playtimeMinutes: 0 })] });

    const hours = playedHours(game);

    expect(hours).toBe(0);
  });

  it("un juego sin copias pero con total a mano tiene horas", () => {
    const game = buildGame({ manualPlayedMinutes: 90, copies: [] });

    const has = hasPlayedHours(game);

    expect(has).toBe(true);
  });

  it("un juego sin copias ni total no tiene horas", () => {
    const game = buildGame({ manualPlayedMinutes: null, copies: [] });

    const has = hasPlayedHours(game);

    expect(has).toBe(false);
  });
});

describe("filtro y orden con el total a mano", () => {
  it("el filtro de horas jugadas incluye un juego sin copias con total a mano", () => {
    const games = [buildGame({ title: "Hades", manualPlayedMinutes: 70 * 60 }), buildGame({ title: "Sin horas" })];

    const result = filterLibrary(games, { ...NO_FILTERS, played: { min: 50, max: null } }).map(({ title }) => title);

    expect(result).toEqual(["Hades"]);
  });

  it("el orden por horas usa el total a mano", () => {
    const games = [
      buildGame({ id: "a", title: "Pocas", copies: [buildCopy({ playtimeMinutes: 60 })] }),
      buildGame({ id: "b", title: "Muchas", manualPlayedMinutes: 70 * 60 }),
      buildGame({ id: "c", title: "Ninguna" }),
    ];

    const sorted = sortLibrary(games, "played").map(({ title }) => title);

    expect(sorted).toEqual(["Muchas", "Pocas", "Ninguna"]);
  });
});

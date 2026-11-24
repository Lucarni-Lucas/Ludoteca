import { describe, expect, it } from "vitest";

import type { ImportCandidate } from "@/model/import/import-entry";
import { matchByTitle, titleKey } from "@/model/import/title-match";

function result(igdbId: number, title: string, year: number | null, baseIgdbId = igdbId): ImportCandidate {
  return { igdbId, baseIgdbId, title, year, coverUrl: null };
}

describe("titleKey", () => {
  it("da la misma clave sin espacios, acentos, mayúsculas ni signos", () => {
    const titles = ["KillingFloor2", "Killing Floor 2", "killing-floor 2"];

    const keys = titles.map(titleKey);

    expect(new Set(keys)).toEqual(new Set(["killingfloor2"]));
  });

  it("ignora los acentos", () => {
    const title = "Pokémon Rojo";

    const key = titleKey(title);

    expect(key).toBe("pokemonrojo");
  });
});

describe("matchByTitle", () => {
  it("Título ambiguo", () => {
    const row = { titles: ["Crash Bandicoot"], year: null };
    const results = [
      result(1, "Crash Bandicoot", 1996),
      result(2, "Crash Bandicoot", 2004),
      result(3, "Crash Bandicoot: The Wrath of Cortex", 2001),
      result(4, "Spyro the Dragon", 1998),
    ];

    const match = matchByTitle(row, results);

    expect(match).toEqual({ kind: "candidates", candidates: [results[0], results[1], results[2]] });
  });

  it("Mismo nombre, otro año", () => {
    const row = { titles: ["20XX"], year: 2020 };
    const results = [result(10, "20XX", 2017)];

    const match = matchByTitle(row, results);

    expect(match).toEqual({ kind: "matched", result: results[0] });
  });

  it("uno igual cruza aunque haya otros parecidos", () => {
    const row = { titles: ["Overwatch", "Blizzard's Overwatch"], year: 2022 };
    const results = [result(1, "Overwatch", 2016), result(2, "Overwatch 2", 2022), result(3, "Tetris", 1984)];

    const match = matchByTitle(row, results);

    expect(match).toEqual({ kind: "matched", result: results[0] });
  });

  it("uno igual cruza aunque la fila no tenga año", () => {
    const row = { titles: ["Hades"], year: null };
    const results = [result(10, "Hades", 2020)];

    const match = matchByTitle(row, results);

    expect(match).toEqual({ kind: "matched", result: results[0] });
  });

  it("cruza por un título alternativo", () => {
    const row = { titles: ["20 Minutes Till Dawn", "Twenty Minutes Till Dawn"], year: 2022 };
    const results = [result(10, "Twenty Minutes Till Dawn", 2023)];

    const match = matchByTitle(row, results);

    expect(match.kind).toBe("matched");
  });

  it("varios con la misma clave quedan como candidatos, el de año más cercano primero", () => {
    const row = { titles: ["Doom"], year: 2016 };
    const results = [result(1, "DOOM", 1993), result(2, "Doom", 2016), result(3, "Doom", null)];

    const match = matchByTitle(row, results);

    expect(match).toEqual({ kind: "candidates", candidates: [results[1], results[0], results[2]] });
  });

  it("sin año en la fila, los de la misma clave quedan en el orden de IGDB", () => {
    const row = { titles: ["Doom"], year: null };
    const results = [result(1, "DOOM", 1993), result(2, "Doom", 2016)];

    const match = matchByTitle(row, results);

    expect(match).toEqual({ kind: "candidates", candidates: results });
  });

  it("una edición del mismo juego base no cuenta como otro candidato", () => {
    const row = { titles: ["The Outer Worlds"], year: 2019 };
    const results = [result(1, "The Outer Worlds", 2019), result(2, "The Outer Worlds", 2023, 1)];

    const match = matchByTitle(row, results);

    expect(match).toEqual({ kind: "matched", result: results[0] });
  });

  it("uno igual sin año en IGDB cruza igual", () => {
    const row = { titles: ["Cartas"], year: 2020 };
    const results = [result(1, "Cartas", null)];

    const match = matchByTitle(row, results);

    expect(match).toEqual({ kind: "matched", result: results[0] });
  });

  it("sin ninguno igual, los que tienen todas las palabras quedan como candidatos, hasta 5", () => {
    const row = { titles: ["Hollow Knight"], year: 2017 };
    const results = [1, 2, 3, 4, 5, 6].map((id) => result(id, `Hollow Knight Parte ${id}`, 2017));

    const match = matchByTitle(row, results);

    expect(match).toEqual({ kind: "candidates", candidates: results.slice(0, 5) });
  });

  it("un resultado cuyas palabras están todas en el título también es candidato", () => {
    const row = { titles: ["Hollow Knight: Voidheart Edition"], year: 2017 };
    const results = [result(1, "Hollow Knight", 2017)];

    const match = matchByTitle(row, results);

    expect(match).toEqual({ kind: "candidates", candidates: results });
  });

  it("nada parecido no se encuentra", () => {
    const row = { titles: ["Crash Bandicoot"], year: 1996 };
    const results = [result(1, "Spyro the Dragon", 1998)];

    const match = matchByTitle(row, results);

    expect(match).toEqual({ kind: "not_found" });
  });

  it("sin resultados no se encuentra", () => {
    const row = { titles: ["Juego Perdido"], year: null };

    const match = matchByTitle(row, []);

    expect(match).toEqual({ kind: "not_found" });
  });
});

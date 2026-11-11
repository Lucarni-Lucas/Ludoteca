import { describe, expect, it } from "vitest";

import { isDisplayableCover } from "@/model/game/cover";
import { durationSource, toCorrections } from "@/model/game/library-game";
import { parseScoreText } from "@/model/game/score";
import { statusSinceLabel } from "@/model/status/status";

import { buildGame, statusByKey } from "./library-fixtures";

describe("parseScoreText", () => {
  it.each([
    { text: "8", expected: 8 },
    { text: "9.35", expected: 9.4 },
    { text: "7,5", expected: 7.5 },
    { text: " 10 ", expected: 10 },
    { text: "0", expected: 0 },
  ])("convierte «$text» en $expected", ({ text, expected }) => {
    const value = text;

    const score = parseScoreText(value);

    expect(score).toBeCloseTo(expected as number, 5);
  });

  it.each(["", "   ", "abc", "11", "-1"])("no acepta «%s» como puntaje", (text) => {
    const value = text;

    const score = parseScoreText(value);

    expect(score).toBeNull();
  });
});

describe("statusSinceLabel", () => {
  it("Ficha con estado", () => {
    const status = statusByKey("playing");

    const label = statusSinceLabel(status, "2026-10-28");

    expect(label).toBe("En curso · desde el 28 oct");
  });

  it("Terminar un juego", () => {
    const status = statusByKey("completed");

    const label = statusSinceLabel(status, "2026-11-06");

    expect(label).toBe("Terminado · lo terminaste el 6 nov");
  });
});

describe("durationSource", () => {
  const catalog = { estimatedHours: 22, endless: false, coverUrl: null };

  it("dice «IGDB» cuando el dato viene del catálogo", () => {
    const game = buildGame({ catalog });

    const source = durationSource(game);

    expect(source).toBe("IGDB");
  });

  it("dice «tuya» cuando el usuario la corrigió", () => {
    const game = buildGame({ catalog, corrections: { estimatedHours: 30, endless: null, coverUrl: null } });

    const source = durationSource(game);

    expect(source).toBe("tuya");
  });

  it("no dice nada en un juego a mano", () => {
    const game = buildGame({ catalog, source: "manual", igdbId: null });

    const source = durationSource(game);

    expect(source).toBeNull();
  });

  it("no dice nada sin duración", () => {
    const game = buildGame();

    const source = durationSource(game);

    expect(source).toBeNull();
  });
});

describe("toCorrections", () => {
  const game = buildGame({ catalog: { estimatedHours: 22, endless: false, coverUrl: null } });

  it("no guarda la marca si coincide con el catálogo", () => {
    const form = { estimatedHours: 30, endless: false, coverUrl: null };

    const corrections = toCorrections(game, form);

    expect(corrections).toEqual({ estimatedHours: 30, endless: null, coverUrl: null });
  });

  it("guarda la marca si difiere del catálogo", () => {
    const form = { estimatedHours: null, endless: true, coverUrl: null };

    const corrections = toCorrections(game, form);

    expect(corrections.endless).toBe(true);
  });
});

describe("isDisplayableCover", () => {
  it.each([
    { url: "https://example.com/a.png", expected: true },
    { url: "http://example.com/a.png", expected: true },
    { url: "https:", expected: false },
    { url: "no-es-un-link", expected: false },
    { url: "javascript:alert(1)", expected: false },
    { url: null, expected: false },
  ])("$url → $expected", ({ url, expected }) => {
    const value = url;

    const displayable = isDisplayableCover(value);

    expect(displayable).toBe(expected);
  });
});

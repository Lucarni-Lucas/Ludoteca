import { describe, expect, it } from "vitest";

import { coverInitials, coverTone, COVER_TONE_COUNT } from "@/model/game/cover";
import { dateParts } from "@/model/game/date-format";
import { resolveInitialStatus } from "@/model/game/initial-status";
import { durationInfo, effectiveCover, effectiveHours } from "@/model/game/library-game";
import { StatusNotFoundError } from "@/model/status/errors";
import { DEFAULT_STATUSES, type Status } from "@/model/status/status";

const NO_CORRECTIONS = { estimatedHours: null, endless: null, coverUrl: null };
const CATALOG = { estimatedHours: 22, endless: false, coverUrl: "https://example.com/catalogo.jpg" };

const statuses: readonly Status[] = DEFAULT_STATUSES.map((value) => ({ ...value, id: value.systemKey ?? value.name }));

describe("datos efectivos", () => {
  it("Juego sin fin", () => {
    const game = { catalog: CATALOG, corrections: { ...NO_CORRECTIONS, endless: true } };

    const info = durationInfo(game);

    expect(info).toEqual({ type: "endless" });
    expect(effectiveHours(game)).toBeNull();
  });

  it("muestra lo corregido antes que lo del catálogo", () => {
    const game = { catalog: CATALOG, corrections: { ...NO_CORRECTIONS, estimatedHours: 30 } };

    const info = durationInfo(game);

    expect(info).toEqual({ type: "hours", hours: 30 });
  });

  it("muestra lo del catálogo cuando no hay corrección", () => {
    const game = { catalog: CATALOG, corrections: NO_CORRECTIONS };

    const info = durationInfo(game);

    expect(info).toEqual({ type: "hours", hours: 22 });
  });

  it("muestra una duración con decimal", () => {
    const game = { catalog: { ...CATALOG, estimatedHours: 12.5 }, corrections: NO_CORRECTIONS };

    const info = durationInfo(game);

    expect(info).toEqual({ type: "hours", hours: 12.5 });
  });

  it("dice «Duración desconocida» cuando no hay dato", () => {
    const game = { catalog: { ...CATALOG, estimatedHours: null }, corrections: NO_CORRECTIONS };

    const info = durationInfo(game);

    expect(info).toEqual({ type: "unknown" });
  });

  it("una corrección puede sacarle el «sin fin» al catálogo", () => {
    const game = { catalog: { ...CATALOG, endless: true }, corrections: { ...NO_CORRECTIONS, endless: false } };

    const info = durationInfo(game);

    expect(info).toEqual({ type: "hours", hours: 22 });
  });

  it("prefiere la portada corregida", () => {
    const game = { catalog: CATALOG, corrections: { ...NO_CORRECTIONS, coverUrl: "https://example.com/propia.jpg" } };

    const cover = effectiveCover(game);

    expect(cover).toBe("https://example.com/propia.jpg");
  });
});

describe("resolveInitialStatus", () => {
  it.each([
    { hasCopy: false, expected: "Quiero jugarlo" },
    { hasCopy: true, expected: "Pendiente" },
  ])("con copia: $hasCopy, queda en «$expected»", ({ hasCopy, expected }) => {
    const choice = { chosenStatusId: null, hasCopy };

    const status = resolveInitialStatus(statuses, choice);

    expect(status.name).toBe(expected);
  });

  it("respeta el estado elegido a mano", () => {
    const choice = { chosenStatusId: "playing", hasCopy: false };

    const status = resolveInitialStatus(statuses, choice);

    expect(status.name).toBe("Jugando");
  });

  it("rechaza un estado que no es del usuario", () => {
    const choice = { chosenStatusId: "estado-ajeno", hasCopy: false };

    const resolve = () => resolveInitialStatus(statuses, choice);

    expect(resolve).toThrow(StatusNotFoundError);
  });
});

describe("coverInitials", () => {
  it("Iniciales", () => {
    const title = "Cartas del Faro";

    const initials = coverInitials(title);

    expect(initials).toBe("CF");
  });

  it.each([
    { title: "¡Hola, Mundo!", expected: "HM" },
    { title: "The Witcher 3", expected: "W3" },
    { title: "Hades", expected: "H" },
    { title: "Sid Meier's Civilization VI", expected: "SM" },
    { title: "The", expected: "?" },
    { title: "De la Mancha", expected: "M" },
    { title: "ñandú veloz", expected: "ÑV" },
  ])("«$title» da «$expected»", ({ title, expected }) => {
    const value = title;

    const initials = coverInitials(value);

    expect(initials).toBe(expected);
  });
});

describe("coverTone", () => {
  it("es estable para un mismo título y queda dentro de la paleta", () => {
    const title = "Cartas del Faro";

    const tone = coverTone(title);

    expect(tone).toBe(coverTone(title));
    expect(tone).toBeGreaterThanOrEqual(0);
    expect(tone).toBeLessThan(COVER_TONE_COUNT);
  });
});

describe("formato de fechas", () => {
  it("«28 oct» para el día y mes", () => {
    const date = "2026-10-28";

    const parts = dateParts(date);

    expect(parts).toEqual({ year: 2026, month: 10, day: 28 });
  });

  it("no agrega un cero al día", () => {
    const date = "2026-11-06";

    const parts = dateParts(date);

    expect(parts.day).toBe(6);
  });

  it("«mar 2023» para el mes y año", () => {
    const date = "2023-03-14";

    const parts = dateParts(date);

    expect(parts).toMatchObject({ year: 2023, month: 3 });
  });
});

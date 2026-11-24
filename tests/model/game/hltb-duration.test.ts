import { describe, expect, it } from "vitest";

import { durationInfo, durationSource, effectiveHours } from "@/model/game/library-game";

import { buildGame } from "./library-fixtures";

describe("duración de HowLongToBeat", () => {
  it("Duración de respaldo", () => {
    const game = buildGame({ title: "60 Seconds!", hltbHours: 2.3 });

    const info = durationInfo(game);

    expect(info).toEqual({ type: "hours", hours: 2.3 });
    expect(durationSource(game)).toBe("hltb");
  });

  it("la duración propia gana sobre la de HowLongToBeat", () => {
    const game = buildGame({ hltbHours: 2.3, corrections: { estimatedHours: 4, endless: null, coverUrl: null } });

    const hours = effectiveHours(game);

    expect(hours).toBe(4);
    expect(durationSource(game)).toBe("own");
  });

  it("la duración de IGDB gana sobre la de HowLongToBeat", () => {
    const game = buildGame({ hltbHours: 2.3, catalog: { estimatedHours: 3, endless: false, coverUrl: null } });

    const hours = effectiveHours(game);

    expect(hours).toBe(3);
    expect(durationSource(game)).toBe("igdb");
  });

  it("un juego sin fin sigue sin duración", () => {
    const game = buildGame({ hltbHours: 2.3, corrections: { estimatedHours: null, endless: true, coverUrl: null } });

    const info = durationInfo(game);

    expect(info).toEqual({ type: "endless" });
    expect(durationSource(game)).toBeNull();
  });

  it("un juego cargado a mano también muestra la de HowLongToBeat", () => {
    const game = buildGame({ source: "manual", igdbId: null, hltbHours: 12 });

    const source = durationSource(game);

    expect(source).toBe("hltb");
  });
});

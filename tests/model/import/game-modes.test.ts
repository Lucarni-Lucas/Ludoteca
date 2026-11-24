import { describe, expect, it } from "vitest";

import { isMultiplayerOnly } from "@/model/import/game-modes";

describe("isMultiplayerOnly", () => {
  it("es solo multijugador si ningún modo es para un jugador", () => {
    const modes = ["multiplayer", "co-operative", "battle-royale"];

    const result = isMultiplayerOnly(modes);

    expect(result).toBe(true);
  });

  it("no lo es si tiene modo para un jugador", () => {
    const modes = ["single-player", "multiplayer"];

    const result = isMultiplayerOnly(modes);

    expect(result).toBe(false);
  });

  it("un juego sin modos cargados no cuenta como solo multijugador", () => {
    const modes: readonly string[] = [];

    const result = isMultiplayerOnly(modes);

    expect(result).toBe(false);
  });
});

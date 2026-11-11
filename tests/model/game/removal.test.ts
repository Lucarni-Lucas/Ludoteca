import { describe, expect, it } from "vitest";

import { planGameRemoval } from "@/model/game/removal";

import { buildGame } from "./library-fixtures";

describe("planGameRemoval", () => {
  it("un juego cargado a mano libera su fila del catálogo", () => {
    const game = buildGame({ id: "biblioteca", catalogGameId: "catalogo", source: "manual", igdbId: null });

    const plan = planGameRemoval(game);

    expect(plan).toEqual({ libraryGameId: "biblioteca", catalogGameIdToDelete: "catalogo" });
  });

  it("un juego de IGDB deja su fila del catálogo", () => {
    const game = buildGame({ id: "biblioteca", catalogGameId: "catalogo", source: "igdb" });

    const plan = planGameRemoval(game);

    expect(plan).toEqual({ libraryGameId: "biblioteca", catalogGameIdToDelete: null });
  });
});

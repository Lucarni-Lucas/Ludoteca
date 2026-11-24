import { describe, expect, it } from "vitest";

import { buildReview, gamesInGroup, type ReviewGame, reviewGame } from "@/model/import/review";

import { entry, EPIC, ignItem, item, openReview, playniteItem, STEAM, steamItem } from "./import-fixtures";

const CONNECTED = { steamConnected: true };
const NOT_CONNECTED = { steamConnected: false };

function review(value: ReturnType<typeof entry>, context = CONNECTED, library: Parameters<typeof reviewGame>[1] = []) {
  return reviewGame(value, library, context) as ReviewGame;
}

describe("reviewGame", () => {
  describe("copias sugeridas", () => {
    it("Juego de Epic", () => {
      const gta = entry("Grand Theft Auto V", [playniteItem("Grand Theft Auto V", EPIC, "9d2d0eb64d5c44529cece33fe2a46482")]);

      const game = review(gta);

      expect(game.suggestion.copies).toEqual([
        expect.objectContaining({ store: EPIC, kind: "free", storeGameId: "9d2d0eb64d5c44529cece33fe2a46482" }),
      ]);
    });

    it("Juego instalado de un familiar", () => {
      const portal = entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]);

      const game = review(portal);

      expect(game.group).toBe("family");
      expect(game.suggestion.copies).toEqual([expect.objectContaining({ store: STEAM, kind: "family" })]);
      expect(game.marked).toEqual({ kind: "copy_kind", copyKind: "family" });
    });

    it("Juego propio instalado", () => {
      const celeste = entry("Celeste", [playniteItem("Celeste", STEAM, "504230"), steamItem("Celeste", "504230", 600)]);

      const game = review(celeste);

      expect(game.group).not.toBe("family");
      expect(game.suggestion.copies).toEqual([
        expect.objectContaining({ store: STEAM, kind: "purchased", playtimeMinutes: 600 }),
      ]);
    });

    it("Steam por dos caminos", () => {
      const hades = entry("Hades", [steamItem("Hades", "1145360", 1500), playniteItem("Hades", STEAM, "1145360")]);

      const game = review(hades);

      expect(game.suggestion.copies).toHaveLength(1);
      expect(game.suggestion.copies[0]).toMatchObject({ store: STEAM, storeGameId: "1145360", playtimeMinutes: 1500 });
    });

    it("una fila de Steam de Playnite tiene horas vacías y no 0", () => {
      const portal = entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]);

      const game = review(portal);

      expect(game.suggestion.copies[0].playtimeMinutes).toBeNull();
    });

    it("The Outer Worlds y su edición dejan una sola copia de Epic con el ID del juego base", () => {
      const outerWorlds = entry("The Outer Worlds", [
        playniteItem("The Outer Worlds: Spacer's Choice Edition", EPIC, "spacers", { playtimeMinutes: 120 }),
        playniteItem("The Outer Worlds", EPIC, "base", { playtimeMinutes: 300 }),
      ]);

      const game = review(outerWorlds);

      expect(game.suggestion.copies).toEqual([
        expect.objectContaining({ store: EPIC, storeGameId: "base", playtimeMinutes: 420 }),
      ]);
    });

    it("una entrada colgada suma sus horas a la copia de su juego base sin darle su ID", () => {
      const barony = entry("Barony", [
        playniteItem("Barony (Beta)", EPIC, "beta", { matchState: "absorbed", playtimeMinutes: 30 }),
        playniteItem("Barony", EPIC, "barony", { playtimeMinutes: 90 }),
      ]);

      const game = review(barony);

      expect(game.suggestion.copies).toEqual([expect.objectContaining({ storeGameId: "barony", playtimeMinutes: 120 })]);
      expect(game.origins).toHaveLength(1);
    });

    it("un tipo elegido pisa la sugerencia", () => {
      const gta = entry("GTA V", [playniteItem("GTA V", EPIC, "gta", { copyKind: "purchased" })]);

      const game = review(gta);

      expect(game.suggestion.copies[0]).toMatchObject({ kind: "purchased", chosen: true });
    });
  });

  describe("fuentes que se juntan", () => {
    it("IGN más Steam", () => {
      const hollowKnight = entry("Hollow Knight", [
        ignItem("Hollow Knight", { ignStatuses: ["beat"], ignScore: 9 }),
        steamItem("Hollow Knight", "367520", 48 * 60),
      ]);

      const game = review(hollowKnight);

      expect(game.suggestion).toMatchObject({ statusKey: "completed", score: 9 });
      expect(game.suggestion.copies).toEqual([expect.objectContaining({ store: STEAM, playtimeMinutes: 2880 })]);
      expect(game.group).toBe("ready");
    });

    it("Backlog de IGN pasa a Pendiente con una copia, y a Quiero jugarlo si se excluye la única", () => {
      const withCopy = entry("8BitMMO", [ignItem("8BitMMO", { ignStatuses: ["backlog"], ignScore: 7 }), steamItem("8BitMMO", "250420", 0)]);
      const withoutCopy = entry("8BitMMO", [
        ignItem("8BitMMO", { ignStatuses: ["backlog"], ignScore: 7 }),
        steamItem("8BitMMO", "250420", 0, { excluded: true }),
      ]);

      const games = [review(withCopy), review(withoutCopy)];

      expect(games.map((game) => game.suggestion.statusKey)).toEqual(["backlog", "wishlist"]);
    });

    it("usa la duración de HowLongToBeat cuando IGDB no la tiene", () => {
      const seconds = entry("60 Seconds!", [ignItem("60 Seconds!", { ignStatuses: ["beat"], hltbMainHours: 2.3 })]);

      const game = review(seconds);

      expect(game).toMatchObject({ estimatedHours: 2.3, suggestion: { hltbHours: 2.3 } });
    });
  });

  describe("grupos y opción marcada", () => {
    it("Título ambiguo: queda en «Para revisar» con el primer candidato marcado", () => {
      const candidate = { igdbId: 1, baseIgdbId: 1, title: "Overwatch", year: 2016, coverUrl: null };
      const overwatch = entry("Overwatch", [ignItem("Overwatch", { matchState: "candidates", candidates: [candidate] })], {
        igdbId: null,
        catalogGameId: null,
        catalog: null,
      });

      const game = review(overwatch);

      expect(game.group).toBe("review");
      expect(game.choices).toEqual([{ kind: "candidate", candidate }, { kind: "search" }]);
      expect(game.marked).toEqual({ kind: "candidate", candidate });
    });

    it("dos estados de IGN quedan en «Para revisar» con el del status marcado", () => {
      const overwatch = entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["beat", "quit"] })]);

      const game = review(overwatch);

      expect(game.group).toBe("review");
      expect(game.choices).toEqual([
        { kind: "status", statusKey: "completed" },
        { kind: "status", statusKey: "abandoned" },
        { kind: "other_status" },
      ]);
      expect(game.marked).toEqual({ kind: "status", statusKey: "completed" });
    });

    it("Juego viejo sin cruce", () => {
      const crash = entry("Crash Bandicoot", [ignItem("Crash Bandicoot", { matchState: "not_found", ignStatuses: ["beat"] })], {
        igdbId: null,
        catalogGameId: null,
        catalog: null,
      });

      const game = review(crash);

      expect(game.group).toBe("not_found");
      expect(game.choices).toEqual([{ kind: "manual" }, { kind: "exclude" }]);
      expect(game.marked).toEqual({ kind: "manual" });
      expect(game.title).toBe("Crash Bandicoot");
    });

    it("una entrada que no es juego sin base va a «No lo encontré» con «No importar» marcado", () => {
      const redacted = entry("[REDACTED]", [playniteItem("[REDACTED]", EPIC, "x", { matchState: "not_found" })], {
        igdbId: null,
        catalogGameId: null,
        catalog: null,
      });

      const game = review(redacted);

      expect(game).toMatchObject({ group: "not_found", nonGame: true, marked: { kind: "exclude" } });
    });

    it("Juego multijugador terminado", () => {
      const amongUs = entry("Among Us", [ignItem("Among Us", { ignStatuses: ["beat"], ignScore: 6 })], {
        multiplayerOnly: true,
      });

      const game = review(amongUs);

      expect(game.group).toBe("endless");
      expect(game.choices).toEqual([{ kind: "endless" }, { kind: "completed" }]);
      expect(game.marked).toEqual({ kind: "endless" });
    });

    it("Sugerencia marcada", () => {
      const operator = entry("112 Operator", [playniteItem("112 Operator", EPIC, "operator", { playtimeMinutes: 0 })]);

      const game = review(operator);

      expect(game.group).toBe("play");
      expect(game.choices).toEqual([{ kind: "keep" }, { kind: "not_interested" }, { kind: "exclude" }]);
      expect(game.marked).toEqual({ kind: "keep" });
    });

    it("un Pendiente de IGN sin puntaje va a «¿Lo vas a jugar alguna vez?» aunque tenga horas", () => {
      const beholder = entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "475550", 90)]);

      const game = review(beholder);

      expect(game.group).toBe("play");
    });

    it("Juego jugado que no estaba en IGN", () => {
      const game = review(entry("Terraria", [steamItem("Terraria", "105600", 12 * 60)]));

      const { group, marked } = game;

      expect(group).toBe("status");
      expect(marked).toEqual({ kind: "status", statusKey: "backlog" });
      expect(game.suggestion.statusKey).toBe("backlog");
    });

    it("un juego sin nada dudoso está en «Listos» sin opciones", () => {
      const celeste = entry("Celeste", [ignItem("Celeste", { ignStatuses: ["playing"], ignScore: 9 }), steamItem("Celeste", "504230", 600)]);

      const game = review(celeste);

      expect(game).toMatchObject({ group: "ready", choices: [], marked: null, decided: false });
    });

    it("lo decidido pasa a «Listos» aunque le tocara otro grupo", () => {
      const amongUs = entry("Among Us", [ignItem("Among Us", { ignStatuses: ["beat"] })], {
        multiplayerOnly: true,
        answers: { endlessAnswer: true },
      });

      const game = review(amongUs);

      expect(game).toMatchObject({ group: "ready", decided: true, suggestion: { statusKey: "played", endless: true } });
    });

    it("un candidato elegido es una decisión", () => {
      const candidate = { igdbId: 1, baseIgdbId: 1, title: "Overwatch", year: 2016, coverUrl: null };
      const overwatch = entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["backlog"], candidates: [candidate] })]);

      const game = review(overwatch);

      expect(game).toMatchObject({ group: "ready", decided: true });
    });
  });

  describe("cuenta de Steam sin conectar", () => {
    it("las filas de Steam de Playnite esperan en «¿Es de tu familia?» sin opciones", () => {
      const portal = entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]);

      const game = review(portal, NOT_CONNECTED);

      expect(game).toMatchObject({ group: "family", choices: [], marked: null });
      expect(game.suggestion.copies[0]).toMatchObject({ awaitingSteam: true, familySuggested: false });
    });
  });

  describe("juego que ya está en la biblioteca", () => {
    it("solo suma las copias que faltan y va a «Listos» sin tocar estado ni grupo", () => {
      const hades = entry("Hades", [ignItem("Hades", { ignStatuses: ["backlog"] }), playniteItem("Hades", EPIC, "hades")]);
      const library = [{ catalogGameId: hades.catalogGameId ?? "", libraryGameId: "game-1", copies: [{ storeId: STEAM.id, storeGameId: null }] }];

      const game = review(hades, CONNECTED, library);

      expect(game).toMatchObject({ group: "ready", libraryGameId: "game-1" });
      expect(game.suggestion.copies.map((copy) => copy.store)).toEqual([EPIC]);
    });

    it("no aparece si ya tiene una copia de cada tienda, aunque sea cargada a mano", () => {
      const hades = entry("Hades", [steamItem("Hades", "1145360", 100)]);
      const library = [{ catalogGameId: hades.catalogGameId ?? "", libraryGameId: "game-1", copies: [{ storeId: STEAM.id, storeGameId: null }] }];

      const game = reviewGame(hades, library, CONNECTED);

      expect(game).toBeNull();
    });
  });
});

describe("buildReview", () => {
  it("arma los grupos en orden, por título, y cuenta lo excluido y lo que ya estaba al día", () => {
    const library = [{ catalogGameId: "catalog-upToDate", libraryGameId: "game-1", copies: [{ storeId: STEAM.id, storeGameId: "1" }] }];
    const entries = [
      entry("Zelda", [ignItem("Zelda", { ignStatuses: ["playing"] })]),
      entry("Among Us", [ignItem("Among Us", { ignStatuses: ["beat"] })], { multiplayerOnly: true }),
      entry("Abzû", [ignItem("Abzû", { ignStatuses: ["playing"] })]),
      entry("Excluido", [item()], { answers: { excluded: true } }),
      entry("Al día", [steamItem("Al día", "1", 10)], { id: "upToDate" }),
    ];

    const result = buildReview(openReview(entries, library), CONNECTED);

    expect(result.groups.map((group) => group.group)).toEqual(["review", "not_found", "family", "endless", "play", "status", "ready"]);
    expect(gamesInGroup(result, "ready").map((game) => game.title)).toEqual(["Abzû", "Zelda"]);
    expect(gamesInGroup(result, "endless").map((game) => game.title)).toEqual(["Among Us"]);
    expect(result).toMatchObject({ excluded: 1, upToDate: 1 });
  });
});

import { describe, expect, it } from "vitest";

import { buildReview, countReady, gamesInGroup, type ReviewGame, reviewGame } from "@/model/import/review";

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
      expect(game.choices).toEqual([
        { kind: "copy_kind", copyKind: "family" },
        { kind: "copy_kind", copyKind: "purchased" },
        { kind: "exclude" },
      ]);
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

    describe("mismo nombre desde varias fuentes", () => {
      const fortnite2017 = { igdbId: 1, baseIgdbId: 1, title: "Fortnite", year: 2017, coverUrl: null };
      const fortnite2018 = { igdbId: 2, baseIgdbId: 2, title: "Fortnite", year: 2018, coverUrl: null };

      function fortnites(epicChoice: number | null = null) {
        const options = { igdbId: epicChoice, catalogGameId: null, catalog: null };
        return entry(
          "Fortnite",
          [
            ignItem("Fortnite", { year: 2017, ignStatuses: ["beat"], ignScore: 8, matchState: "candidates", candidates: [fortnite2017, fortnite2018] }),
            playniteItem("Fortnite", EPIC, "Fortnite", { year: 2020, playtimeMinutes: 120 * 60, matchState: "candidates", candidates: [fortnite2018] }),
          ],
          options,
        );
      }

      it("Fortnite de IGN y de Epic", () => {
        const both = fortnites();

        const game = review(both);

        expect(game.group).toBe("which");
        expect(game.origins.map((origin) => [origin.source, origin.title, origin.year])).toEqual([
          ["ign", "Fortnite", 2017],
          ["playnite", "Fortnite", 2020],
        ]);
        expect(game.choices.filter((choice) => choice.kind === "candidate")).toEqual([
          { kind: "candidate", candidate: fortnite2017 },
          { kind: "candidate", candidate: fortnite2018 },
        ]);
      });

      it("al elegir, entra una vez con el puntaje de IGN y la copia de Epic", () => {
        const chosen = entry(
          "Fortnite",
          fortnites().items.map((value) => ({ ...value, chosenIgdbId: 1 })),
          { igdbId: 1 },
        );

        const game = review(chosen);

        expect(game.group).toBe("ready");
        expect(game.suggestion.score).toBe(8);
        expect(game.suggestion.copies).toEqual([expect.objectContaining({ store: EPIC, playtimeMinutes: 7200 })]);
      });

      it("«¿Es este juego?» mira todos los nombres con que llegó", () => {
        const castlevania = { igdbId: 3, baseIgdbId: 3, title: "Castlevania Collection", year: 2019, coverUrl: null };
        const both = entry(
          "Castlevania",
          [
            ignItem("Castlevania Collection", { matchState: "not_found" }),
            playniteItem("Castlevania Anniversary", EPIC, "c", { matchState: "candidates", candidates: [castlevania] }),
          ],
          { igdbId: null, catalogGameId: null, catalog: null },
        );

        const game = review(both);

        expect(game).toMatchObject({ group: "which", isThisQuestion: false });
      });
    });

    it("usa la duración de HowLongToBeat cuando IGDB no la tiene", () => {
      const seconds = entry("60 Seconds!", [ignItem("60 Seconds!", { ignStatuses: ["beat"], hltbMainHours: 2.3 })]);

      const game = review(seconds);

      expect(game).toMatchObject({ estimatedHours: 2.3, suggestion: { hltbHours: 2.3 } });
    });
  });

  describe("grupos y respuestas", () => {
    it("Elegir entre varios", () => {
      const candidates = [1996, 1997, 2004, 2017, 2020].map((year, index) => ({
        igdbId: index + 1,
        baseIgdbId: index + 1,
        title: "Crash Bandicoot",
        year,
        coverUrl: `https://images.igdb.com/crash-${year}.jpg`,
      }));
      const crash = entry("Crash Bandicoot", [ignItem("Crash Bandicoot", { year: 1996, matchState: "candidates", candidates })], {
        igdbId: null,
        catalogGameId: null,
        catalog: null,
      });

      const game = review(crash);

      expect(game).toMatchObject({ group: "which", isThisQuestion: false });
      expect(game.origins).toEqual([expect.objectContaining({ source: "ign", title: "Crash Bandicoot", year: 1996 })]);
      expect(game.choices).toEqual([
        ...candidates.map((candidate) => ({ kind: "candidate", candidate })),
        { kind: "search" },
        { kind: "exclude" },
      ]);
    });

    it("Un solo candidato con otro nombre", () => {
      const candidate = {
        igdbId: 9,
        baseIgdbId: 9,
        title: "Castlevania: Anniversary Collection - Ultimate Edition",
        year: 2019,
        coverUrl: null,
      };
      const castlevania = entry(
        "Castlevania Anniversary Collection",
        [playniteItem("Castlevania Anniversary Collection", EPIC, "castle", { year: 2019, matchState: "candidates", candidates: [candidate] })],
        { igdbId: null, catalogGameId: null, catalog: null },
      );

      const game = review(castlevania);

      expect(game).toMatchObject({ group: "which", isThisQuestion: true });
      expect(game.origins[0]).toMatchObject({ source: "playnite", storeName: "Epic Games", year: 2019 });
      expect(game.choices).toEqual([{ kind: "candidate", candidate }, { kind: "search" }, { kind: "exclude" }]);
    });

    it("Terminado y abandonado", () => {
      const overwatch = entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["beat", "quit"] })]);

      const game = review(overwatch);

      expect(game).toMatchObject({ group: "how_left" });
      expect(game.choices).toEqual([
        { kind: "status", statusKey: "completed" },
        { kind: "status", statusKey: "abandoned" },
        { kind: "other_status" },
        { kind: "exclude" },
      ]);
    });

    it("sin saber qué juego es, «¿Cuál de estos es?» va antes que «¿Cómo lo dejaste?»", () => {
      const candidates = [1, 2].map((igdbId) => ({ igdbId, baseIgdbId: igdbId, title: "Doom", year: 1993 + igdbId, coverUrl: null }));
      const doom = entry("Doom", [ignItem("Doom", { ignStatuses: ["beat", "quit"], matchState: "candidates", candidates })], {
        igdbId: null,
        catalog: null,
      });

      const game = review(doom);

      expect(game.group).toBe("which");
    });

    it("Juego viejo sin cruce", () => {
      const crash = entry("Crash Bandicoot", [ignItem("Crash Bandicoot", { matchState: "not_found", ignStatuses: ["beat"] })], {
        igdbId: null,
        catalogGameId: null,
        catalog: null,
      });

      const game = review(crash);

      expect(game.group).toBe("not_found");
      expect(game.choices).toEqual([{ kind: "search" }, { kind: "manual" }, { kind: "exclude" }]);
      expect(game.title).toBe("Crash Bandicoot");
    });

    it("una entrada que no es juego, traída con «Volver a revisar», está en «No lo encontré» con su marca", () => {
      const redacted = entry("Cuphead Demo", [playniteItem("Cuphead Demo", EPIC, "x", { matchState: "not_found" })], {
        igdbId: null,
        catalogGameId: null,
        catalog: null,
      });

      const game = review(redacted);

      expect(game).toMatchObject({ group: "not_found", nonGame: true });
    });

    it("Juego multijugador terminado", () => {
      const amongUs = entry("Among Us", [ignItem("Among Us", { ignStatuses: ["beat"], ignScore: 6 })], {
        multiplayerOnly: true,
      });

      const game = review(amongUs);

      expect(game.group).toBe("endless");
      expect(game.choices).toEqual([{ kind: "endless" }, { kind: "completed" }, { kind: "exclude" }]);
    });

    it("Nada marcado", () => {
      const operator = entry("112 Operator", [playniteItem("112 Operator", EPIC, "operator", { playtimeMinutes: 0 })]);

      const game = review(operator);

      expect(game.group).toBe("play");
      expect(game.choices).toEqual([{ kind: "keep" }, { kind: "not_interested" }, { kind: "exclude" }]);
    });

    it("un Pendiente de IGN sin puntaje va a «¿Lo vas a jugar alguna vez?» aunque tenga horas", () => {
      const beholder = entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "475550", 90)]);

      const game = review(beholder);

      expect(game.group).toBe("play");
    });

    it("Juego jugado que no estaba en IGN", () => {
      const game = review(entry("Terraria", [steamItem("Terraria", "105600", 12 * 60)]));

      const { group, choices } = game;

      expect(group).toBe("status");
      expect(choices).toEqual([
        { kind: "status", statusKey: "playing" },
        { kind: "status", statusKey: "completed" },
        { kind: "status", statusKey: "abandoned" },
        { kind: "status", statusKey: "tried" },
        { kind: "other_status" },
        { kind: "exclude" },
      ]);
    });

    it("una respuesta de «Elegí un estado» cuyo estado el usuario borró no se ofrece", () => {
      const terraria = entry("Terraria", [steamItem("Terraria", "105600", 12 * 60)]);
      const context = { ...CONNECTED, statusKeys: ["playing", "completed", "abandoned", "backlog"] };

      const game = review(terraria, context);

      expect(game.choices.map((choice) => (choice.kind === "status" ? choice.statusKey : choice.kind))).toEqual([
        "playing",
        "completed",
        "abandoned",
        "other_status",
        "exclude",
      ]);
    });

    it("Demo sin su juego", () => {
      const demo = entry("Cuphead Demo", [playniteItem("Cuphead Demo", STEAM, "268910", { matchState: "not_found" })], {
        igdbId: null,
        catalogGameId: null,
        catalog: null,
        answers: { excluded: true },
      });

      const game = review(demo);

      expect(game).toMatchObject({ group: "ready", nonGame: true, decided: true, choices: [] });
    });

    it("un juego que el usuario excluyó no aparece en ningún grupo", () => {
      const excluded = entry("Crash", [ignItem("Crash", { matchState: "not_found" })], {
        igdbId: null,
        catalog: null,
        answers: { excluded: true },
      });

      const game = reviewGame(excluded, [], CONNECTED);

      expect(game).toBeNull();
    });

    it("un juego sin nada dudoso está en «Listos para importar» sin opciones", () => {
      const celeste = entry("Celeste", [ignItem("Celeste", { ignStatuses: ["playing"], ignScore: 9 }), steamItem("Celeste", "504230", 600)]);

      const game = review(celeste);

      expect(game).toMatchObject({ group: "ready", choices: [], decided: false });
    });

    describe("después de decir qué juego es", () => {
      const love = { igdbId: 40, baseIgdbId: 40, title: "Love", year: 2015, coverUrl: null };

      it("Elegido sin jugar", () => {
        const chosen = entry(
          "Love",
          [playniteItem("LOVE", EPIC, "love", { playtimeMinutes: 0, matchState: "candidates", candidates: [love], chosenIgdbId: 40 })],
          { igdbId: 40 },
        );

        const game = review(chosen);

        expect(game).toMatchObject({ group: "play", decided: true });
      });

      it("Cargado a mano sin jugar", () => {
        const manual = entry(
          "Juego viejo",
          [ignItem("Juego viejo", { ignStatuses: ["backlog"], matchState: "not_found" }), playniteItem("Juego viejo", EPIC, "viejo", { matchState: "not_found" })],
          { igdbId: null, catalogGameId: null, catalog: null, answers: { manualTitle: "Juego viejo" } },
        );

        const game = review(manual);

        expect(game).toMatchObject({ group: "play", manual: true, decided: true });
      });

      it("Elegido sin dudas", () => {
        const crash = { igdbId: 1, baseIgdbId: 1, title: "Crash Bandicoot", year: 1996, coverUrl: null };
        const chosen = entry(
          "Crash Bandicoot",
          [ignItem("Crash Bandicoot", { ignStatuses: ["beat"], ignScore: 8, matchState: "candidates", candidates: [crash], chosenIgdbId: 1 })],
          { igdbId: 1 },
        );

        const game = review(chosen);

        expect(game).toMatchObject({ group: "ready", suggestion: { statusKey: "completed", score: 8 } });
      });

      it("un juego elegido que es solo multijugador y llegó como Completado va a «¿Es sin fin?»", () => {
        const overwatch = { igdbId: 7, baseIgdbId: 7, title: "Overwatch", year: 2016, coverUrl: null };
        const chosen = entry(
          "Overwatch",
          [ignItem("Overwatch", { ignStatuses: ["beat"], ignScore: 5, matchState: "candidates", candidates: [overwatch], chosenIgdbId: 7 })],
          { igdbId: 7, multiplayerOnly: true },
        );

        const game = review(chosen);

        expect(game.group).toBe("endless");
      });

      it("un juego elegido que ya está en la biblioteca no pasa por las preguntas que deciden su estado", () => {
        const chosen = entry(
          "Love",
          [playniteItem("LOVE", EPIC, "love", { playtimeMinutes: 0, matchState: "candidates", candidates: [love], chosenIgdbId: 40 })],
          { igdbId: 40 },
        );
        const library = [{ catalogGameId: chosen.catalogGameId ?? "", libraryGameId: "game-love", copies: [] }];

        const game = review(chosen, CONNECTED, library);

        expect(game.group).toBe("ready");
      });
    });

    it("«Sí, es de mi familia» en un juego con 0 h en otra tienda lo lleva a «¿Lo vas a jugar alguna vez?»", () => {
      const portal = entry("Portal 2", [playniteItem("Portal 2", STEAM, "620", { copyKind: "family" }), playniteItem("Portal 2", EPIC, "p")]);

      const game = review(portal);

      expect(game).toMatchObject({ group: "play", decided: true });
    });

    it("«¿Cómo lo conseguiste?» no saltea preguntas", () => {
      const operator = entry("112 Operator", [playniteItem("112 Operator", EPIC, "operator", { copyKind: "purchased" })]);

      const game = review(operator);

      expect(game.group).toBe("play");
    });

    it("lo decidido pasa a «Listos para importar» aunque le tocara otro grupo", () => {
      const amongUs = entry("Among Us", [ignItem("Among Us", { ignStatuses: ["beat"] })], {
        multiplayerOnly: true,
        answers: { endlessAnswer: true },
      });

      const game = review(amongUs);

      expect(game).toMatchObject({ group: "ready", decided: true, suggestion: { statusKey: "played", endless: true } });
    });

    it("Cómo va a entrar", () => {
      const operator = entry("112 Operator", [playniteItem("112 Operator", EPIC, "operator", { playtimeMinutes: 0 })], {
        answers: { playAnswer: "keep" },
      });

      const game = review(operator);

      expect(game).toMatchObject({
        group: "ready",
        manual: false,
        libraryGameId: null,
        suggestion: { statusKey: "backlog", notInterested: false, endless: false },
      });
      expect(game.suggestion.copies).toEqual([expect.objectContaining({ store: EPIC, kind: "free", excluded: false })]);
    });

    it("un juego cargado a mano lo dice en «Listos para importar»", () => {
      const crash = entry("Crash", [ignItem("Crash Bandicoot", { matchState: "not_found", ignStatuses: ["beat"] })], {
        igdbId: null,
        catalog: null,
        answers: { manualTitle: "Crash Bandicoot" },
      });

      const game = review(crash);

      expect(game).toMatchObject({ group: "ready", manual: true, title: "Crash Bandicoot", suggestion: { statusKey: "completed" } });
    });

    it("un candidato elegido es una decisión", () => {
      const candidate = { igdbId: 1, baseIgdbId: 1, title: "Overwatch", year: 2016, coverUrl: null };
      const overwatch = entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["backlog"], matchState: "candidates", candidates: [candidate], chosenIgdbId: 1 })]);

      const game = review(overwatch);

      expect(game).toMatchObject({ group: "ready", decided: true });
    });
  });

  describe("cuenta de Steam sin conectar", () => {
    it("las filas de Steam de Playnite esperan en «¿Es de tu familia?» sin opciones", () => {
      const portal = entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]);

      const game = review(portal, NOT_CONNECTED);

      expect(game).toMatchObject({ group: "family", choices: [] });
      expect(game.suggestion.copies[0]).toMatchObject({ awaitingSteam: true, familySuggested: false });
    });
  });

  describe("juego que ya está en la biblioteca", () => {
    it("solo suma las copias que faltan y va a «Listos para importar» sin tocar estado ni grupo", () => {
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

    expect(result.groups.map((group) => group.group)).toEqual([
      "which",
      "how_left",
      "not_found",
      "family",
      "endless",
      "play",
      "status",
      "ready",
    ]);
    expect(gamesInGroup(result, "ready").map((game) => game.title)).toEqual(["Abzû", "Zelda"]);
    expect(gamesInGroup(result, "endless").map((game) => game.title)).toEqual(["Among Us"]);
    expect(result).toMatchObject({ excluded: 1, upToDate: 1 });
  });

  it("lo que no es un juego está en «Listos para importar» pero no cuenta en juegos ni copias", () => {
    const entries = [
      entry("112 Operator", [ignItem("112 Operator", { ignStatuses: ["playing"] }), playniteItem("112 Operator", EPIC, "op")]),
      entry("Cuphead Demo", [playniteItem("Cuphead Demo", STEAM, "268910", { matchState: "not_found" })], {
        igdbId: null,
        catalogGameId: null,
        catalog: null,
        answers: { excluded: true },
      }),
    ];

    const result = buildReview(openReview(entries), CONNECTED);

    expect(gamesInGroup(result, "ready").map((game) => game.title)).toEqual(["112 Operator", "Cuphead Demo"]);
    expect(countReady(result)).toEqual({ games: 1, copies: 1 });
  });
});

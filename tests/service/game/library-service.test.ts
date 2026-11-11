import { describe, expect, it } from "vitest";

import {
  GameAlreadyInLibraryError,
  GameNotFoundError,
  GameNotFromIgdbError,
  GameNotManualError,
  ScoreOutOfRangeError,
} from "@/model/game/errors";
import { StatusNotFoundError } from "@/model/status/errors";
import { createLibraryService } from "@/service/game/library-service";

import { buildGame, statusByKey } from "../../model/game/library-fixtures";
import { clock, createFakeGameRepo, createFakeIgdb, igdbData, statusService, TODAY, USER_ID } from "./fakes";

const FOREIGN_ID = "juego-ajeno";
const CORRECTIONS = { estimatedHours: 30, endless: null, coverUrl: null };

type Dependencies = Parameters<typeof createLibraryService>[0];

function buildService(overrides: Partial<Dependencies> = {}) {
  return createLibraryService({
    gameRepo: createFakeGameRepo(),
    statusService,
    igdb: createFakeIgdb(),
    clock,
    ...overrides,
  });
}

describe("createLibraryService", () => {
  it("lista la biblioteca del usuario", async () => {
    const games = [buildGame({ id: "hades" })];
    const service = buildService({ gameRepo: createFakeGameRepo(games) });

    const library = await service.listLibrary(USER_ID);

    expect(library).toEqual(games);
  });

  it("devuelve null para un juego ajeno al buscarlo", async () => {
    const service = buildService();

    const game = await service.findGame(USER_ID, FOREIGN_ID);

    expect(game).toBeNull();
  });

  describe("cambiar de estado", () => {
    it("aplica el cambio con la fecha de hoy", async () => {
      const gameRepo = createFakeGameRepo([buildGame({ id: "hades", status: statusByKey("playing") })]);
      const service = buildService({ gameRepo });

      await service.changeStatus(USER_ID, "hades", "completed");

      expect(gameRepo.applyStatusChange).toHaveBeenCalledWith(USER_ID, "hades", {
        statusId: "completed",
        statusSince: TODAY,
        entry: { occurredOn: TODAY, fromStatusId: "playing", toStatusId: "completed" },
      });
    });

    it("no hace nada al elegir el mismo estado", async () => {
      const gameRepo = createFakeGameRepo([buildGame({ id: "hades", status: statusByKey("playing") })]);
      const service = buildService({ gameRepo });

      await service.changeStatus(USER_ID, "hades", "playing");

      expect(gameRepo.applyStatusChange).not.toHaveBeenCalled();
    });

    it("rechaza un estado ajeno", async () => {
      const service = buildService({ gameRepo: createFakeGameRepo([buildGame({ id: "hades" })]) });

      const change = service.changeStatus(USER_ID, "hades", "estado-ajeno");

      await expect(change).rejects.toBeInstanceOf(StatusNotFoundError);
    });
  });

  describe("puntaje", () => {
    it("redondea a un decimal antes de guardar", async () => {
      const gameRepo = createFakeGameRepo([buildGame({ id: "hades" })]);
      const service = buildService({ gameRepo });

      await service.setScore(USER_ID, "hades", 9.35);

      expect(gameRepo.updateScore.mock.calls[0]).toEqual([USER_ID, "hades", expect.closeTo(9.4, 10)]);
    });

    it("rechaza un puntaje fuera de rango", async () => {
      const service = buildService({ gameRepo: createFakeGameRepo([buildGame({ id: "hades" })]) });

      const set = service.setScore(USER_ID, "hades", 11);

      await expect(set).rejects.toBeInstanceOf(ScoreOutOfRangeError);
    });

    it("puede quitar el puntaje", async () => {
      const gameRepo = createFakeGameRepo([buildGame({ id: "hades", score: 7 })]);
      const service = buildService({ gameRepo });

      const score = await service.setScore(USER_ID, "hades", null);

      expect(score).toBeNull();
      expect(gameRepo.updateScore).toHaveBeenCalledWith(USER_ID, "hades", null);
    });
  });

  it.each([
    { name: "cambiar el estado", act: (s: ReturnType<typeof buildService>) => s.changeStatus(USER_ID, FOREIGN_ID, "playing") },
    { name: "poner puntaje", act: (s: ReturnType<typeof buildService>) => s.setScore(USER_ID, FOREIGN_ID, 5) },
    { name: "corregir", act: (s: ReturnType<typeof buildService>) => s.updateCorrections(USER_ID, FOREIGN_ID, CORRECTIONS) },
    { name: "vincular", act: (s: ReturnType<typeof buildService>) => s.linkToIgdb(USER_ID, FOREIGN_ID, 1) },
    { name: "actualizar", act: (s: ReturnType<typeof buildService>) => s.refreshFromIgdb(USER_ID, FOREIGN_ID) },
  ])("rechaza $name sobre un id ajeno con GameNotFoundError", async ({ act }) => {
    const service = buildService();

    const action = act(service);

    await expect(action).rejects.toBeInstanceOf(GameNotFoundError);
  });

  describe("vincular con IGDB", () => {
    const manual = buildGame({ id: "faro", source: "manual", igdbId: null, catalogGameId: "fila-manual" });

    it("apunta el juego a los datos de IGDB", async () => {
      const gameRepo = createFakeGameRepo([manual]);
      const igdb = createFakeIgdb([], new Map([[5, igdbData(5, "Cartas del Faro")]]));
      const service = buildService({ gameRepo, igdb });

      await service.linkToIgdb(USER_ID, "faro", 5);

      expect(gameRepo.linkToIgdb).toHaveBeenCalledWith(USER_ID, manual, igdbData(5, "Cartas del Faro"));
    });

    it("no vincula un juego que ya viene de IGDB", async () => {
      const service = buildService({ gameRepo: createFakeGameRepo([buildGame({ id: "hades" })]) });

      const link = service.linkToIgdb(USER_ID, "hades", 5);

      await expect(link).rejects.toBeInstanceOf(GameNotManualError);
    });

    it("rechaza un juego que IGDB no encuentra", async () => {
      const service = buildService({ gameRepo: createFakeGameRepo([manual]) });

      const link = service.linkToIgdb(USER_ID, "faro", 999);

      await expect(link).rejects.toBeInstanceOf(GameNotFoundError);
    });

    it("deja pasar el error de un juego que ya tiene", async () => {
      const gameRepo = createFakeGameRepo([manual]);
      gameRepo.linkToIgdb.mockRejectedValue(new GameAlreadyInLibraryError());
      const igdb = createFakeIgdb([], new Map([[5, igdbData(5, "Hades")]]));
      const service = buildService({ gameRepo, igdb });

      const link = service.linkToIgdb(USER_ID, "faro", 5);

      await expect(link).rejects.toBeInstanceOf(GameAlreadyInLibraryError);
    });
  });

  describe("actualizar desde IGDB", () => {
    it("reescribe la fila del catálogo", async () => {
      const gameRepo = createFakeGameRepo([buildGame({ id: "hades", igdbId: 1, catalogGameId: "fila" })]);
      const igdb = createFakeIgdb([], new Map([[1, igdbData(1, "Hades")]]));
      const service = buildService({ gameRepo, igdb });

      await service.refreshFromIgdb(USER_ID, "hades");

      expect(gameRepo.updateCatalogFromIgdb).toHaveBeenCalledWith("fila", igdbData(1, "Hades"));
    });

    it("rechaza un juego cargado a mano", async () => {
      const game = buildGame({ id: "faro", source: "manual", igdbId: null });
      const service = buildService({ gameRepo: createFakeGameRepo([game]) });

      const refresh = service.refreshFromIgdb(USER_ID, "faro");

      await expect(refresh).rejects.toBeInstanceOf(GameNotFromIgdbError);
    });
  });

  describe("quitar de la biblioteca", () => {
    it("aplica el plan del modelo", async () => {
      const gameRepo = createFakeGameRepo([buildGame({ id: "hades", catalogGameId: "fila" })]);
      const service = buildService({ gameRepo });

      await service.removeFromLibrary(USER_ID, "hades");

      expect(gameRepo.removeFromLibrary).toHaveBeenCalledWith(USER_ID, {
        libraryGameId: "hades",
        catalogGameIdToDelete: null,
      });
    });

    it.each(["juego-ajeno", "no-existe"])("rechaza %s sin tocar el repositorio de escritura", async (gameId) => {
      const gameRepo = createFakeGameRepo();
      const service = buildService({ gameRepo });

      const removal = service.removeFromLibrary(USER_ID, gameId);

      await expect(removal).rejects.toBeInstanceOf(GameNotFoundError);
      expect(gameRepo.removeFromLibrary).not.toHaveBeenCalled();
    });
  });
});

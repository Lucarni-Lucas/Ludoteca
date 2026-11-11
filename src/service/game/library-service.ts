import { assertIgdbGame, assertManualGame } from "@/model/game/add-game";
import type { IgdbGameData } from "@/model/game/catalog";
import { GameNotFoundError } from "@/model/game/errors";
import type { GameCorrections, LibraryGame } from "@/model/game/library-game";
import { planGameRemoval, type GameRemovalPlan } from "@/model/game/removal";
import { normalizeScore } from "@/model/game/score";
import { StatusNotFoundError } from "@/model/status/errors";
import { planStatusChange, type Status, type StatusChangePlan } from "@/model/status/status";

type LibraryServiceDependencies = Readonly<{
  gameRepo: Readonly<{
    listLibrary(userId: string): Promise<readonly LibraryGame[]>;
    findById(userId: string, gameId: string): Promise<LibraryGame | null>;
    applyStatusChange(userId: string, gameId: string, plan: StatusChangePlan): Promise<void>;
    updateCorrections(userId: string, gameId: string, corrections: GameCorrections): Promise<void>;
    updateScore(userId: string, gameId: string, score: number | null): Promise<void>;
    setNotInterested(userId: string, gameIds: readonly string[], notInterested: boolean): Promise<void>;
    linkToIgdb(userId: string, game: Pick<LibraryGame, "id" | "catalogGameId">, data: IgdbGameData): Promise<void>;
    updateCatalogFromIgdb(catalogGameId: string, data: IgdbGameData): Promise<void>;
    removeFromLibrary(userId: string, plan: GameRemovalPlan): Promise<void>;
  }>;
  statusService: Readonly<{ listStatuses(userId: string): Promise<readonly Status[]> }>;
  igdb: Readonly<{ getGame(igdbId: number): Promise<IgdbGameData | null> }>;
  clock: Readonly<{ today(): string }>;
}>;

export type LibraryService = Readonly<{
  listLibrary(userId: string): Promise<readonly LibraryGame[]>;
  findGame(userId: string, gameId: string): Promise<LibraryGame | null>;
  changeStatus(userId: string, gameId: string, statusId: string): Promise<void>;
  setScore(userId: string, gameId: string, score: number | null): Promise<number | null>;
  updateCorrections(userId: string, gameId: string, corrections: GameCorrections): Promise<void>;
  setNotInterested(userId: string, gameIds: readonly string[], notInterested: boolean): Promise<void>;
  linkToIgdb(userId: string, gameId: string, igdbId: number): Promise<void>;
  refreshFromIgdb(userId: string, gameId: string): Promise<void>;
  removeFromLibrary(userId: string, gameId: string): Promise<void>;
}>;

export function createLibraryService({
  gameRepo,
  statusService,
  igdb,
  clock,
}: LibraryServiceDependencies): LibraryService {
  async function getGame(userId: string, gameId: string): Promise<LibraryGame> {
    const game = await gameRepo.findById(userId, gameId);

    if (!game) {
      throw new GameNotFoundError();
    }

    return game;
  }

  async function getIgdbData(igdbId: number): Promise<IgdbGameData> {
    const data = await igdb.getGame(igdbId);

    if (!data) {
      throw new GameNotFoundError();
    }

    return data;
  }

  async function getStatus(userId: string, statusId: string): Promise<Status> {
    const status = (await statusService.listStatuses(userId)).find((candidate) => candidate.id === statusId);

    if (!status) {
      throw new StatusNotFoundError();
    }

    return status;
  }

  return {
    async listLibrary(userId) {
      // Si el usuario todavía no tiene estados, este es su primer uso de la biblioteca.
      await statusService.listStatuses(userId);
      return gameRepo.listLibrary(userId);
    },

    findGame(userId, gameId) {
      return gameRepo.findById(userId, gameId);
    },

    async changeStatus(userId, gameId, statusId) {
      const [game, target] = await Promise.all([getGame(userId, gameId), getStatus(userId, statusId)]);
      const plan = planStatusChange(game, target, clock.today());

      if (plan) {
        await gameRepo.applyStatusChange(userId, gameId, plan);
      }
    },

    async setScore(userId, gameId, score) {
      const normalized = score === null ? null : normalizeScore(score);

      await getGame(userId, gameId);
      await gameRepo.updateScore(userId, gameId, normalized);
      return normalized;
    },

    async updateCorrections(userId, gameId, corrections) {
      await getGame(userId, gameId);
      await gameRepo.updateCorrections(userId, gameId, corrections);
    },

    setNotInterested(userId, gameIds, notInterested) {
      return gameRepo.setNotInterested(userId, gameIds, notInterested);
    },

    async linkToIgdb(userId, gameId, igdbId) {
      const game = await getGame(userId, gameId);

      assertManualGame(game);
      await gameRepo.linkToIgdb(userId, game, await getIgdbData(igdbId));
    },

    async refreshFromIgdb(userId, gameId) {
      const game = await getGame(userId, gameId);
      const data = await getIgdbData(assertIgdbGame(game));

      await gameRepo.updateCatalogFromIgdb(game.catalogGameId, data);
    },

    async removeFromLibrary(userId, gameId) {
      const game = await getGame(userId, gameId);

      await gameRepo.removeFromLibrary(userId, planGameRemoval(game));
    },
  };
}

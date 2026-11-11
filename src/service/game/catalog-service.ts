import type { CopyKind } from "@/model/copy/copy";
import { buildNewCopy, type NewCopy } from "@/model/copy/new-copy";
import {
  type AddGameResult,
  markSearchResults,
  type MarkedSearchResult,
  type NewLibraryEntry,
  type OwnedGameMark,
} from "@/model/game/add-game";
import type { CatalogGameData, IgdbGameData, IgdbSearchResult } from "@/model/game/catalog";
import { GameNotFoundError } from "@/model/game/errors";
import { resolveInitialStatus } from "@/model/game/initial-status";
import type { Status } from "@/model/status/status";
import type { StoreChoice, StoreResolver } from "@/service/copy/store-resolver";

export type ManualGameInput = Readonly<{
  title: string;
  year: number | null;
  estimatedHours: number | null;
  coverUrl: string | null;
  pageUrl: string | null;
  statusId: string | null;
  store: StoreChoice | null;
  kind: CopyKind | null;
  acquiredOn: string | null;
  familyOwner: string | null;
}>;

type CatalogServiceDependencies = Readonly<{
  igdb: Readonly<{
    search(text: string, signal?: AbortSignal): Promise<readonly IgdbSearchResult[]>;
    getGame(igdbId: number): Promise<IgdbGameData | null>;
  }>;
  gameRepo: Readonly<{
    findOwnedMarks(userId: string, igdbIds: readonly number[]): Promise<readonly OwnedGameMark[]>;
    addIgdbGame(userId: string, data: IgdbGameData, entry: NewLibraryEntry): Promise<AddGameResult>;
    addManualGame(userId: string, data: CatalogGameData, entry: NewLibraryEntry): Promise<string>;
  }>;
  statusService: Readonly<{ listStatuses(userId: string): Promise<readonly Status[]> }>;
  storeResolver: StoreResolver;
  clock: Readonly<{ today(): string }>;
}>;

export type CatalogService = Readonly<{
  search(userId: string, text: string, signal?: AbortSignal): Promise<readonly MarkedSearchResult[]>;
  addFromIgdb(userId: string, igdbId: number): Promise<AddGameResult>;
  addManual(userId: string, input: ManualGameInput): Promise<string>;
}>;

export function createCatalogService({
  igdb,
  gameRepo,
  statusService,
  storeResolver,
  clock,
}: CatalogServiceDependencies): CatalogService {
  /** Una copia necesita tienda y tipo: con uno solo de los dos no hay nada que guardar. */
  async function resolveManualCopy(userId: string, input: ManualGameInput): Promise<NewCopy | null> {
    if (input.store === null || input.kind === null) {
      return null;
    }

    const store = await storeResolver.resolve(userId, input.store);
    return buildNewCopy(store.id, { kind: input.kind, acquiredOn: input.acquiredOn, familyOwner: input.familyOwner });
  }

  return {
    async search(userId, text, signal) {
      const results = await igdb.search(text, signal);
      const owned = await gameRepo.findOwnedMarks(userId, [...new Set(results.map((result) => result.baseIgdbId))]);

      return markSearchResults(results, owned);
    },

    async addFromIgdb(userId, igdbId) {
      const data = await igdb.getGame(igdbId);

      if (!data) {
        throw new GameNotFoundError();
      }

      const statuses = await statusService.listStatuses(userId);
      const status = resolveInitialStatus(statuses, { chosenStatusId: null, hasCopy: false });

      return gameRepo.addIgdbGame(userId, data, { statusId: status.id, statusSince: clock.today(), copy: null });
    },

    async addManual(userId, input) {
      const copy = await resolveManualCopy(userId, input);
      const statuses = await statusService.listStatuses(userId);
      const status = resolveInitialStatus(statuses, { chosenStatusId: input.statusId, hasCopy: copy !== null });

      return gameRepo.addManualGame(
        userId,
        {
          title: input.title,
          year: input.year,
          developer: null,
          coverUrl: input.coverUrl,
          pageUrl: input.pageUrl,
          estimatedHours: input.estimatedHours,
          endless: false,
        },
        { statusId: status.id, statusSince: clock.today(), copy },
      );
    },
  };
}

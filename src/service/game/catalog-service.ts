import { buildNewCopy, type CopyRow, type NewCopy, validateCopyRows, type ValidCopyRow } from "@/model/copy/new-copy";
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
import { validateReleaseYear } from "@/model/game/release-year";
import { playedMinutesFromHours } from "@/model/game/played-hours";
import { normalizeOptionalScore } from "@/model/game/score";
import type { Status } from "@/model/status/status";
import type { StoreChoice, StoreResolver } from "@/service/copy/store-resolver";

export type NewCopyInput = CopyRow<StoreChoice>;

/** Lo que tienen en común las dos variantes del formulario de alta: copias, estado y puntaje. */
export type LibraryEntryInput = Readonly<{
  statusId: string | null;
  copies: readonly NewCopyInput[];
  score: number | null;
  /** Opcional: vacío es «sin total a mano». */
  playedHours?: number | null;
}>;

export const EMPTY_ENTRY_INPUT: LibraryEntryInput = { statusId: null, copies: [], score: null };

export type ManualGameInput = LibraryEntryInput &
  Readonly<{
    title: string;
    year: number | null;
    estimatedHours: number | null;
    coverUrl: string | null;
    pageUrl: string | null;
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
  addFromIgdb(userId: string, igdbId: number, input: LibraryEntryInput): Promise<AddGameResult>;
  addManual(userId: string, input: ManualGameInput): Promise<string>;
}>;

type ValidEntry = Readonly<{
  statusId: string | null;
  rows: readonly ValidCopyRow<StoreChoice>[];
  score: number | null;
  playedMinutes: number | null;
}>;

/** Todo lo que se puede rechazar sin tocar la base va primero: así un error no deja una tienda «Otra» creada. */
function validateEntry(input: LibraryEntryInput): ValidEntry {
  return {
    statusId: input.statusId,
    rows: validateCopyRows(input.copies),
    score: normalizeOptionalScore(input.score),
    playedMinutes: playedMinutesFromHours(input.playedHours ?? null),
  };
}

export function createCatalogService({
  igdb,
  gameRepo,
  statusService,
  storeResolver,
  clock,
}: CatalogServiceDependencies): CatalogService {
  /** De a una: dos filas con la misma tienda «Otra» la crean una sola vez. */
  async function resolveCopies(userId: string, rows: readonly ValidCopyRow<StoreChoice>[]): Promise<NewCopy[]> {
    const copies: NewCopy[] = [];

    for (const row of rows) {
      const store = await storeResolver.resolve(userId, row.store);
      copies.push(buildNewCopy(store.id, row));
    }

    return copies;
  }

  async function resolveEntry(userId: string, entry: ValidEntry, today: string): Promise<NewLibraryEntry> {
    const statuses = await statusService.listStatuses(userId);
    // El estado va antes que las tiendas: uno ajeno frena el alta sin crear nada.
    const status = resolveInitialStatus(statuses, { chosenStatusId: entry.statusId, hasCopy: entry.rows.length > 0 });
    const copies = await resolveCopies(userId, entry.rows);

    const played = entry.playedMinutes === null ? {} : { playedMinutes: entry.playedMinutes };
    return { statusId: status.id, statusSince: today, copies, score: entry.score, ...played };
  }

  return {
    async search(userId, text, signal) {
      const results = await igdb.search(text, signal);
      const owned = await gameRepo.findOwnedMarks(userId, [...new Set(results.map((result) => result.baseIgdbId))]);

      return markSearchResults(results, owned);
    },

    async addFromIgdb(userId, igdbId, input) {
      const entry = validateEntry(input);
      const data = await igdb.getGame(igdbId);

      if (!data) {
        throw new GameNotFoundError();
      }

      return gameRepo.addIgdbGame(userId, data, await resolveEntry(userId, entry, clock.today()));
    },

    async addManual(userId, input) {
      const today = clock.today();
      const year = validateReleaseYear(input.year, today);
      const entry = validateEntry(input);

      return gameRepo.addManualGame(
        userId,
        {
          title: input.title,
          year,
          developer: null,
          coverUrl: input.coverUrl,
          pageUrl: input.pageUrl,
          estimatedHours: input.estimatedHours,
          endless: false,
        },
        await resolveEntry(userId, entry, today),
      );
    },
  };
}

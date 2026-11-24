import { vi } from "vitest";

import type { IgdbSearchResult } from "@/model/game/catalog";
import type { ImportConfirmationPlan } from "@/model/import/confirm";
import type {
  ImportItem,
  ItemMatch,
  LibraryTitle,
  MatchedGame,
  NewImportItem,
  OpenReview,
} from "@/model/import/import-entry";
import type { ImportRow } from "@/model/import/import-row";
import type { Store } from "@/model/store/store";
import type { StoreConnection } from "@/model/store/store-connection";
import { DEFAULT_STATUSES, type Status } from "@/model/status/status";
import { createStoreResolver } from "@/service/copy/store-resolver";
import { createImportService, type ImportServiceDependencies } from "@/service/import/import-service";

import { EPIC, GOG, STEAM } from "../../model/import/import-fixtures";

export const USER_ID = "usuario";
export const TODAY = "2026-11-23";
export const STATUSES: readonly Status[] = DEFAULT_STATUSES.map((value) => ({ ...value, id: `status-${value.systemKey}` }));

export function emptyReview(): OpenReview {
  return { entries: [], library: [], pendingCount: 0, itemCount: 0 };
}

export function createFakeImportRepo() {
  const state = {
    saved: [] as NewImportItem[],
    pending: [] as ImportItem[],
    open: [] as ImportItem[],
    libraryTitles: [] as LibraryTitle[],
    review: emptyReview(),
    matches: [] as ItemMatch[],
    confirmations: [] as ImportConfirmationPlan[],
    lastActivityAt: null as Date | null,
  };

  return {
    state,
    upsertItems: vi.fn(async (_userId: string, items: readonly NewImportItem[]) => {
      state.saved.push(...items);
      return { inserted: items.length, updated: 0 };
    }),
    listPendingItems: vi.fn(async (_userId: string, limit: number) => state.pending.slice(0, limit)),
    listOpenItems: vi.fn(async () => (state.open.length > 0 ? state.open : state.pending)),
    listLibraryTitles: vi.fn(async () => state.libraryTitles),
    saveMatches: vi.fn(async (_userId: string, matches: readonly ItemMatch[]) => {
      state.matches.push(...matches);
    }),
    listOpenReview: vi.fn(async () => state.review),
    summarizeSources: vi.fn(async () => []),
    saveDecision: vi.fn(async () => undefined),
    clearDecision: vi.fn(async () => undefined),
    matchEntry: vi.fn(async () => undefined),
    applyConfirmation: vi.fn(async (_userId: string, plan: ImportConfirmationPlan) => {
      state.confirmations.push(plan);
    }),
    discardOpenReview: vi.fn(async () => {
      state.review = emptyReview();
    }),
    lastOpenActivityAt: vi.fn(async (): Promise<Date | null> => state.lastActivityAt),
    touchOpenReview: vi.fn(async () => undefined),
  };
}

export type FakeIgdbData = Readonly<{
  externalIds?: ReadonlyMap<string, number>;
  titles?: ReadonlyMap<string, readonly IgdbSearchResult[]>;
  games?: ReadonlyMap<number, MatchedGame>;
}>;

export function createFakeIgdb({ externalIds = new Map(), titles = new Map(), games = new Map() }: FakeIgdbData = {}) {
  return {
    findByExternalIds: vi.fn(async (store: string, uids: readonly string[]) => {
      const found = new Map<string, number>();
      uids.forEach((uid) => {
        const igdbId = externalIds.get(`${store}:${uid}`);
        if (igdbId !== undefined) found.set(uid, igdbId);
      });
      return found;
    }),
    searchMany: vi.fn(async (asked: readonly string[]) => new Map(asked.map((title) => [title, titles.get(title) ?? []]))),
    getGamesData: vi.fn(async (ids: readonly number[]) => {
      const found = new Map<number, MatchedGame>();
      ids.forEach((id) => {
        const game = games.get(id);
        if (game) found.set(id, game);
      });
      return found;
    }),
  };
}

export function createFakeSteam(rows: readonly ImportRow[] = [], configured = true) {
  return {
    isConfigured: vi.fn(() => configured),
    resolveVanity: vi.fn(async () => "76561197960287930"),
    getOwnedGames: vi.fn(async () => rows),
  };
}

export function createFakeConnections(initial: StoreConnection | null = null) {
  const saved: StoreConnection[] = initial ? [initial] : [];

  return {
    saved,
    findByStore: vi.fn(async (_userId: string, storeId: string) => saved.find((value) => value.storeId === storeId) ?? null),
    save: vi.fn(async (_userId: string, value: { storeId: string; accountId: string }) => {
      const connection = { ...value, lastSyncedAt: null };
      saved.splice(0, saved.length, connection);
      return connection;
    }),
  };
}

export function createFakeStores(initial: readonly Store[] = [STEAM, EPIC, GOG]) {
  const stores = [...initial];

  return {
    stores,
    listAvailable: vi.fn(async () => [...stores]),
    findAvailable: vi.fn(async (_userId: string, storeId: string) => stores.find(({ id }) => id === storeId) ?? null),
    insertOwn: vi.fn(async (_userId: string, name: string, slug: string) => {
      const store = { id: `propia-${slug}`, name, slug };
      stores.push(store);
      return store;
    }),
  };
}

export function matchedGame(igdbId: number, title: string, overrides: Partial<MatchedGame> = {}): MatchedGame {
  return {
    igdbId,
    title,
    year: 2020,
    developer: null,
    coverUrl: null,
    pageUrl: null,
    estimatedHours: 10,
    endless: false,
    multiplayerOnly: false,
    ...overrides,
  };
}

export function searchResult(igdbId: number, title: string, year: number | null = 2020): IgdbSearchResult {
  return { igdbId, baseIgdbId: igdbId, title, year, coverUrl: null };
}

type Overrides = Partial<{
  importRepo: ReturnType<typeof createFakeImportRepo>;
  igdb: ReturnType<typeof createFakeIgdb>;
  steam: ReturnType<typeof createFakeSteam>;
  connections: ReturnType<typeof createFakeConnections>;
  stores: ReturnType<typeof createFakeStores>;
  statuses: readonly Status[];
}>;

export function setup(overrides: Overrides = {}) {
  const importRepo = overrides.importRepo ?? createFakeImportRepo();
  const igdb = overrides.igdb ?? createFakeIgdb();
  const steam = overrides.steam ?? createFakeSteam();
  const connections = overrides.connections ?? createFakeConnections();
  const stores = overrides.stores ?? createFakeStores();
  const statusService = { listStatuses: vi.fn(async () => overrides.statuses ?? STATUSES) };
  const dependencies: ImportServiceDependencies = {
    importRepo,
    fileReaders: [],
    igdb,
    steam,
    connections,
    stores,
    storeResolver: createStoreResolver(stores),
    statusService,
    clock: { today: () => TODAY },
  };

  return { importRepo, igdb, steam, connections, stores, statusService, dependencies, service: createImportService(dependencies) };
}

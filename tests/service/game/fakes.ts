import { vi } from "vitest";

import type { AddGameResult, NewLibraryEntry, OwnedGameMark } from "@/model/game/add-game";
import type { CatalogGameData, IgdbGameData, IgdbSearchResult } from "@/model/game/catalog";
import type { LibraryGame } from "@/model/game/library-game";
import type { Store } from "@/model/store/store";
import { DEFAULT_STATUSES, type Status } from "@/model/status/status";
import { createStoreResolver } from "@/service/copy/store-resolver";

export const USER_ID = "usuario";
export const TODAY = "2026-11-06";
export const clock = { today: () => TODAY };

/** Los estados por defecto, usando el `system_key` como id. */
export const STATUSES: readonly Status[] = DEFAULT_STATUSES.map((value) => ({ ...value, id: value.systemKey ?? "" }));

export const statusService = { listStatuses: async () => STATUSES };

export const STEAM: Store = { id: "steam", name: "Steam", slug: "steam" };
export const ITCH: Store = { id: "itch", name: "itch.io", slug: "itch-io" };

export function createFakeStoreRepo(initial: readonly Store[] = [STEAM, ITCH]) {
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

export function fakeStoreResolver(repo = createFakeStoreRepo()) {
  return createStoreResolver(repo);
}

export function igdbData(igdbId: number, title: string): IgdbGameData {
  return {
    igdbId,
    title,
    year: 2020,
    developer: "Estudio",
    coverUrl: null,
    pageUrl: null,
    estimatedHours: 10,
    endless: false,
  };
}

export function searchResult(igdbId: number, title: string, baseIgdbId = igdbId): IgdbSearchResult {
  return { igdbId, baseIgdbId, title, year: 2020, coverUrl: null };
}

export function createFakeIgdb(
  results: readonly IgdbSearchResult[] = [],
  games: ReadonlyMap<number, IgdbGameData> = new Map(),
) {
  return {
    search: vi.fn(async () => results),
    getGame: vi.fn(async (igdbId: number) => games.get(igdbId) ?? null),
  };
}

export function createFakeGameRepo(library: readonly LibraryGame[] = [], marks: readonly OwnedGameMark[] = []) {
  return {
    findOwnedMarks: vi.fn(async () => marks),
    addIgdbGame: vi.fn(
      async (_userId: string, _data: IgdbGameData, _entry: NewLibraryEntry): Promise<AddGameResult> => ({
        kind: "added",
        gameId: "nuevo",
      }),
    ),
    addManualGame: vi.fn(async (_userId: string, _data: CatalogGameData, _entry: NewLibraryEntry) => "manual"),
    listLibrary: vi.fn(async () => library),
    findById: vi.fn(async (_userId: string, gameId: string) => library.find(({ id }) => id === gameId) ?? null),
    applyStatusChange: vi.fn(async () => undefined),
    updateCorrections: vi.fn(async () => undefined),
    updateScore: vi.fn(async () => undefined),
    setNotInterested: vi.fn(async () => undefined),
    linkToIgdb: vi.fn(async () => undefined),
    updateCatalogFromIgdb: vi.fn(async () => undefined),
    removeFromLibrary: vi.fn(async () => undefined),
  };
}

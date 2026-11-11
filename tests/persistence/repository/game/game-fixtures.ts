import { DEFAULT_STATUSES, type Status } from "@/model/status/status";
import type { IgdbGameData } from "@/model/game/catalog";
import type { Store } from "@/model/store/store";
import { createCopyRepository } from "@/persistence/repository/copy/copy-repository";
import { createGameRepository } from "@/persistence/repository/game/game-repository";
import { createStatusRepository } from "@/persistence/repository/status/status-repository";
import { createStoreRepository } from "@/persistence/repository/store/store-repository";

import type { TestDatabase } from "../../pglite";

export const TODAY = "2026-11-06";

export function createRepositories({ db }: TestDatabase) {
  return {
    games: createGameRepository(db),
    copies: createCopyRepository(db),
    statuses: createStatusRepository(db),
    stores: createStoreRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

export async function seedStatuses(repositories: Repositories, userId: string): Promise<readonly Status[]> {
  await repositories.statuses.insertDefaults(userId, DEFAULT_STATUSES);
  return repositories.statuses.listByUser(userId);
}

export function statusNamed(statuses: readonly Status[], name: string): Status {
  const status = statuses.find((candidate) => candidate.name === name);

  if (!status) {
    throw new Error(`Estado de prueba desconocido: ${name}`);
  }

  return status;
}

export async function steamOf(repositories: Repositories, userId: string): Promise<Store> {
  const stores = await repositories.stores.listAvailable(userId);
  return stores.find(({ slug }) => slug === "steam") as Store;
}

export function igdbData(igdbId: number, title: string, overrides: Partial<IgdbGameData> = {}): IgdbGameData {
  return {
    igdbId,
    title,
    year: 2020,
    developer: "Estudio",
    coverUrl: "https://example.com/portada.jpg",
    pageUrl: `https://www.igdb.com/games/${igdbId}`,
    estimatedHours: 22,
    endless: false,
    ...overrides,
  };
}

export const MANUAL_DATA = {
  title: "Cartas del Faro",
  year: null,
  developer: null,
  coverUrl: null,
  pageUrl: null,
  estimatedHours: null,
  endless: false,
};

export function entry(statuses: readonly Status[], name = "Pendiente") {
  return { statusId: statusNamed(statuses, name).id, statusSince: TODAY, copy: null };
}

import { randomUUID } from "node:crypto";

import { createIgdbAdapter, type IgdbAdapter } from "@/adapter/igdb/igdb-adapter";
import { createStorageAdapter } from "@/adapter/supabase-storage/storage-adapter";
import { getIgdbEnv, getStorageEnv } from "@/config/env";
import { getDatabase } from "@/persistence/db";
import { createGameRepository, type GameRepository } from "@/persistence/repository/game/game-repository";
import { createProviderTokenRepository } from "@/persistence/repository/game/provider-token-repository";
import { createStoreRepository } from "@/persistence/repository/store/store-repository";
import { createStoreResolver } from "@/service/copy/store-resolver";
import { type CatalogService, createCatalogService } from "@/service/game/catalog-service";
import { type CoverService, createCoverService } from "@/service/game/cover-service";
import { createLibraryService, type LibraryService } from "@/service/game/library-service";
import { createPlayedHoursService, type PlayedHoursService } from "@/service/game/played-hours-service";
import { getStatusService } from "@/service/status/instance";
import { clock } from "@/shared/clock";

const TWITCH_PROVIDER = "twitch";

let igdbAdapter: IgdbAdapter | undefined;
let gameRepository: GameRepository | undefined;
let catalogService: CatalogService | undefined;
let libraryService: LibraryService | undefined;
let coverService: CoverService | undefined;
let playedHoursService: PlayedHoursService | undefined;

function getIgdbAdapter(): IgdbAdapter {
  if (!igdbAdapter) {
    const tokens = createProviderTokenRepository(getDatabase());

    igdbAdapter = createIgdbAdapter({
      getEnv: getIgdbEnv,
      tokenStore: {
        read: () => tokens.find(TWITCH_PROVIDER),
        write: (token) => tokens.save(TWITCH_PROVIDER, token),
      },
    });
  }

  return igdbAdapter;
}

function getGameRepository(): GameRepository {
  gameRepository ??= createGameRepository(getDatabase());
  return gameRepository;
}

export function getCatalogService(): CatalogService {
  catalogService ??= createCatalogService({
    igdb: getIgdbAdapter(),
    gameRepo: getGameRepository(),
    statusService: getStatusService(),
    storeResolver: createStoreResolver(createStoreRepository(getDatabase())),
    clock,
  });
  return catalogService;
}

export function getLibraryService(): LibraryService {
  libraryService ??= createLibraryService({
    gameRepo: getGameRepository(),
    statusService: getStatusService(),
    igdb: getIgdbAdapter(),
    clock,
  });
  return libraryService;
}

export function getPlayedHoursService(): PlayedHoursService {
  playedHoursService ??= createPlayedHoursService({ gameRepo: getGameRepository() });
  return playedHoursService;
}

export function getCoverService(): CoverService {
  coverService ??= createCoverService({ storage: createStorageAdapter(getStorageEnv), newFileId: randomUUID });
  return coverService;
}

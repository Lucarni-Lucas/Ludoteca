import { readIgnExport } from "@/adapter/ign/ign-adapter";
import { buildIgnBookmarklet } from "@/adapter/ign/ign-bookmarklet";
import { readPlayniteExport } from "@/adapter/playnite/playnite-adapter";
import { createSteamAdapter } from "@/adapter/steam/steam-adapter";
import { findSteamEnv } from "@/config/env";
import { getDatabase } from "@/persistence/db";
import { createImportRepository } from "@/persistence/repository/import/import-repository";
import { createStoreConnectionRepository } from "@/persistence/repository/store/store-connection-repository";
import { createStoreRepository } from "@/persistence/repository/store/store-repository";
import { createStoreResolver } from "@/service/copy/store-resolver";
import { getIgdbAdapter } from "@/service/game/instance";
import { createImportGuideService, type ImportGuideService } from "@/service/import/guide-service";
import { createImportService, type ImportService } from "@/service/import/import-service";
import { getStatusService } from "@/service/status/instance";
import { clock } from "@/shared/clock";

let importService: ImportService | undefined;

export function getImportService(): ImportService {
  if (!importService) {
    const db = getDatabase();
    const stores = createStoreRepository(db);

    importService = createImportService({
      importRepo: createImportRepository(db),
      fileReaders: [readIgnExport, readPlayniteExport],
      // Un solo adapter de IGDB para todo el proceso: la espera entre pedidos vale para todos.
      igdb: getIgdbAdapter(),
      steam: createSteamAdapter({ getEnv: findSteamEnv }),
      connections: createStoreConnectionRepository(db),
      stores,
      storeResolver: createStoreResolver(stores),
      statusService: getStatusService(),
      clock,
    });
  }

  return importService;
}

let guideService: ImportGuideService | undefined;

export function getImportGuideService(): ImportGuideService {
  guideService ??= createImportGuideService({ buildIgnBookmarklet });
  return guideService;
}

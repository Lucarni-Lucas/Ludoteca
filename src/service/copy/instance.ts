import { getDatabase } from "@/persistence/db";
import { createCopyRepository } from "@/persistence/repository/copy/copy-repository";
import { createGameRepository } from "@/persistence/repository/game/game-repository";
import { createStoreRepository } from "@/persistence/repository/store/store-repository";
import { type CopyService, createCopyService } from "@/service/copy/copy-service";
import { createStoreResolver } from "@/service/copy/store-resolver";
import { getStatusService } from "@/service/status/instance";
import { clock } from "@/shared/clock";

let copyService: CopyService | undefined;

export function getCopyService(): CopyService {
  if (!copyService) {
    const storeRepo = createStoreRepository(getDatabase());

    copyService = createCopyService({
      gameRepo: createGameRepository(getDatabase()),
      copyRepo: createCopyRepository(getDatabase()),
      storeRepo,
      statusService: getStatusService(),
      storeResolver: createStoreResolver(storeRepo),
      clock,
    });
  }

  return copyService;
}

import { type LostMark, type LostReason, markCopyLost } from "@/model/copy/copy";
import { buildNewCopy, type NewCopy, type NewCopyDetails, validateCopyDetails } from "@/model/copy/new-copy";
import { GameNotFoundError } from "@/model/game/errors";
import type { LibraryGame } from "@/model/game/library-game";
import type { Store } from "@/model/store/store";
import type { StoreChoice, StoreResolver } from "@/service/copy/store-resolver";

export type AddCopyInput = NewCopyDetails & Readonly<{ store: StoreChoice }>;

type CopyServiceDependencies = Readonly<{
  gameRepo: Readonly<{ findById(userId: string, gameId: string): Promise<LibraryGame | null> }>;
  copyRepo: Readonly<{
    addCopy(userId: string, gameId: string, value: NewCopy): Promise<void>;
    markLost(userId: string, copyId: string, mark: LostMark): Promise<void>;
    recover(userId: string, copyId: string): Promise<void>;
    remove(userId: string, copyId: string): Promise<void>;
  }>;
  storeRepo: Readonly<{ listAvailable(userId: string): Promise<readonly Store[]> }>;
  storeResolver: StoreResolver;
  clock: Readonly<{ today(): string }>;
}>;

export type CopyService = Readonly<{
  listStores(userId: string): Promise<readonly Store[]>;
  addCopy(userId: string, gameId: string, input: AddCopyInput): Promise<void>;
  markLost(userId: string, copyId: string, reason: LostReason, lostAt: string | null): Promise<void>;
  recover(userId: string, copyId: string): Promise<void>;
  remove(userId: string, copyId: string): Promise<void>;
}>;

export function createCopyService({
  gameRepo,
  copyRepo,
  storeRepo,
  storeResolver,
  clock,
}: CopyServiceDependencies): CopyService {
  return {
    listStores(userId) {
      return storeRepo.listAvailable(userId);
    },

    async addCopy(userId, gameId, input) {
      const game = await gameRepo.findById(userId, gameId);

      if (!game) {
        throw new GameNotFoundError();
      }

      // Agregar una copia no cambia el estado: «Quiero jugarlo» ya no es la wishlist (`04` design.md §19).
      const details = validateCopyDetails(input);
      const store = await storeResolver.resolve(userId, input.store);

      await copyRepo.addCopy(userId, gameId, buildNewCopy(store.id, details));
    },

    markLost(userId, copyId, reason, lostAt) {
      return copyRepo.markLost(userId, copyId, markCopyLost(lostAt ?? clock.today(), reason));
    },

    recover(userId, copyId) {
      return copyRepo.recover(userId, copyId);
    },

    remove(userId, copyId) {
      return copyRepo.remove(userId, copyId);
    },
  };
}

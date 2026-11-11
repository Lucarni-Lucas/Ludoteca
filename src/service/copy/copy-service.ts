import { type LostMark, type LostReason, markCopyLost } from "@/model/copy/copy";
import {
  buildNewCopy,
  movedToNotice,
  type NewCopy,
  type NewCopyDetails,
  planStatusAfterNewCopy,
} from "@/model/copy/new-copy";
import { GameNotFoundError } from "@/model/game/errors";
import type { LibraryGame } from "@/model/game/library-game";
import { BACKLOG_KEY, findStatusByKey, type Status, type StatusChangePlan } from "@/model/status/status";
import type { Store } from "@/model/store/store";
import type { StoreChoice, StoreResolver } from "@/service/copy/store-resolver";

export type AddCopyInput = NewCopyDetails & Readonly<{ store: StoreChoice }>;

export type AddCopyResult = Readonly<{ notice: string | null }>;

type CopyServiceDependencies = Readonly<{
  gameRepo: Readonly<{ findById(userId: string, gameId: string): Promise<LibraryGame | null> }>;
  copyRepo: Readonly<{
    addCopy(userId: string, gameId: string, value: NewCopy, statusPlan: StatusChangePlan | null): Promise<void>;
    markLost(userId: string, copyId: string, mark: LostMark): Promise<void>;
    recover(userId: string, copyId: string): Promise<void>;
    remove(userId: string, copyId: string): Promise<void>;
  }>;
  storeRepo: Readonly<{ listAvailable(userId: string): Promise<readonly Store[]> }>;
  statusService: Readonly<{ listStatuses(userId: string): Promise<readonly Status[]> }>;
  storeResolver: StoreResolver;
  clock: Readonly<{ today(): string }>;
}>;

export type CopyService = Readonly<{
  listStores(userId: string): Promise<readonly Store[]>;
  addCopy(userId: string, gameId: string, input: AddCopyInput): Promise<AddCopyResult>;
  markLost(userId: string, copyId: string, reason: LostReason, lostAt: string | null): Promise<void>;
  recover(userId: string, copyId: string): Promise<void>;
  remove(userId: string, copyId: string): Promise<void>;
}>;

export function createCopyService({
  gameRepo,
  copyRepo,
  storeRepo,
  statusService,
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

      const [store, statuses] = await Promise.all([
        storeResolver.resolve(userId, input.store),
        statusService.listStatuses(userId),
      ]);
      const plan = planStatusAfterNewCopy(game, input.kind, statuses, clock.today());

      await copyRepo.addCopy(userId, gameId, buildNewCopy(store.id, input), plan);

      const backlog = findStatusByKey(statuses, BACKLOG_KEY);
      return { notice: plan && backlog ? movedToNotice(game.title, backlog.name) : null };
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

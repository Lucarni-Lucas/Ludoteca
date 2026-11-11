import { and, eq } from "drizzle-orm";

import { CopyNotFoundError } from "@/model/copy/errors";
import type { LostMark } from "@/model/copy/copy";
import { NO_LOST_MARK } from "@/model/copy/copy";
import type { NewCopy } from "@/model/copy/new-copy";
import { GameNotFoundError } from "@/model/game/errors";
import type { StatusChangePlan } from "@/model/status/status";
import type { Database } from "@/persistence/db";
import { toNewCopyRow } from "@/persistence/mapper/copy/copy-mapper";
import { copy } from "@/persistence/sql/copy/copy";
import { libraryGame } from "@/persistence/sql/game/library-game";

import { writeStatusChange } from "../game/status-change-writer";

export type CopyRepository = Readonly<{
  addCopy(userId: string, gameId: string, value: NewCopy, statusPlan: StatusChangePlan | null): Promise<void>;
  markLost(userId: string, copyId: string, mark: LostMark): Promise<void>;
  recover(userId: string, copyId: string): Promise<void>;
  remove(userId: string, copyId: string): Promise<void>;
}>;

function ownCopy(userId: string, copyId: string) {
  return and(eq(copy.id, copyId), eq(copy.userId, userId));
}

function assertFound(rows: readonly unknown[]): void {
  if (rows.length === 0) {
    throw new CopyNotFoundError();
  }
}

async function assertOwnGame(tx: Database, userId: string, gameId: string): Promise<void> {
  const rows = await tx
    .select({ id: libraryGame.id })
    .from(libraryGame)
    .where(and(eq(libraryGame.id, gameId), eq(libraryGame.userId, userId)))
    .limit(1);

  if (rows.length === 0) {
    throw new GameNotFoundError();
  }
}

export function createCopyRepository(db: Database): CopyRepository {
  async function updateOwnCopy(
    userId: string,
    copyId: string,
    values: Partial<typeof copy.$inferInsert>,
  ): Promise<void> {
    assertFound(await db.update(copy).set(values).where(ownCopy(userId, copyId)).returning({ id: copy.id }));
  }

  return {
    addCopy(userId, gameId, value, statusPlan) {
      return db.transaction(async (tx) => {
        await assertOwnGame(tx, userId, gameId);
        await tx.insert(copy).values(toNewCopyRow(userId, gameId, value));

        if (statusPlan) {
          await writeStatusChange(tx, userId, gameId, statusPlan);
        }
      });
    },

    markLost(userId, copyId, mark) {
      return updateOwnCopy(userId, copyId, mark);
    },

    recover(userId, copyId) {
      return updateOwnCopy(userId, copyId, NO_LOST_MARK);
    },

    async remove(userId, copyId) {
      assertFound(await db.delete(copy).where(ownCopy(userId, copyId)).returning({ id: copy.id }));
    },
  };
}

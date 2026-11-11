import { and, eq } from "drizzle-orm";

import { GameNotFoundError } from "@/model/game/errors";
import type { StatusChangePlan } from "@/model/status/status";
import type { Database } from "@/persistence/db";
import { libraryGame } from "@/persistence/sql/game/library-game";
import { journalEntry } from "@/persistence/sql/journal/journal-entry";

/**
 * El estado y su registro se escriben juntos, siempre dentro de la transacción de quien llama.
 * Compartir la transacción entre repositorios obligaría al servicio a conocer Drizzle.
 */
export async function writeStatusChange(
  tx: Database,
  userId: string,
  gameId: string,
  plan: StatusChangePlan,
): Promise<void> {
  const updated = await tx
    .update(libraryGame)
    .set({ statusId: plan.statusId, statusSince: plan.statusSince })
    .where(and(eq(libraryGame.id, gameId), eq(libraryGame.userId, userId)))
    .returning({ id: libraryGame.id });

  if (updated.length === 0) {
    throw new GameNotFoundError();
  }

  await tx.insert(journalEntry).values({
    userId,
    libraryGameId: gameId,
    kind: "status_change",
    ...plan.entry,
  });
}

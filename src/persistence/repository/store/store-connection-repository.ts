import { and, eq } from "drizzle-orm";

import type { NewStoreConnection, StoreConnection } from "@/model/store/store-connection";
import type { Database } from "@/persistence/db";
import { toNewStoreConnectionRow, toStoreConnection } from "@/persistence/mapper/store/store-connection-mapper";
import { storeConnection } from "@/persistence/sql/store/store-connection";

export type StoreConnectionRepository = Readonly<{
  findByStore(userId: string, storeId: string): Promise<StoreConnection | null>;
  save(userId: string, value: NewStoreConnection): Promise<StoreConnection>;
}>;

export function createStoreConnectionRepository(db: Database): StoreConnectionRepository {
  return {
    async findByStore(userId, storeId) {
      const [row] = await db
        .select()
        .from(storeConnection)
        .where(and(eq(storeConnection.userId, userId), eq(storeConnection.storeId, storeId)))
        .limit(1);
      return row ? toStoreConnection(row) : null;
    },

    async save(userId, value) {
      // Conectar otra cuenta de la misma tienda la reemplaza; la fecha de sincronización queda como estaba.
      const [row] = await db
        .insert(storeConnection)
        .values(toNewStoreConnectionRow(userId, value))
        .onConflictDoUpdate({
          target: [storeConnection.userId, storeConnection.storeId],
          set: { accountId: value.accountId },
        })
        .returning();
      return toStoreConnection(row);
    },
  };
}

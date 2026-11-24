import type { NewStoreConnection, StoreConnection } from "@/model/store/store-connection";
import type { storeConnection } from "@/persistence/sql/store/store-connection";

type StoreConnectionRow = typeof storeConnection.$inferSelect;
type NewStoreConnectionRow = typeof storeConnection.$inferInsert;

export function toStoreConnection(row: StoreConnectionRow): StoreConnection {
  return {
    storeId: row.storeId,
    accountId: row.accountId,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
  };
}

export function toNewStoreConnectionRow(userId: string, value: NewStoreConnection): NewStoreConnectionRow {
  return { userId, storeId: value.storeId, accountId: value.accountId };
}

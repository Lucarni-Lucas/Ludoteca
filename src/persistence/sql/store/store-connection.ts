import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "../columns";
import { store } from "./store";

/** Una sola cuenta por tienda y usuario: conectar otra reemplaza la anterior. */
export const storeConnection = pgTable(
  "store_connection",
  {
    id: primaryId(),
    userId: uuid("user_id").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => store.id),
    accountId: text("account_id").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [unique("store_connection_user_store_unique").on(table.userId, table.storeId)],
).enableRLS();

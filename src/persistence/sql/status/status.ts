import { integer, pgEnum, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import type { StatusColor } from "../../../model/status/status";
import { STATUS_GROUPS } from "../../../model/status/status-group";
import { primaryId, timestamps } from "../columns";

export const statusGroupEnum = pgEnum("status_group", STATUS_GROUPS);

export const status = pgTable(
  "status",
  {
    id: primaryId(),
    userId: uuid("user_id").notNull(),
    statusGroup: statusGroupEnum("status_group").notNull(),
    name: text("name").notNull(),
    color: text("color").$type<StatusColor>().notNull(),
    position: integer("position").notNull(),
    systemKey: text("system_key"),
    ...timestamps(),
  },
  (table) => [unique("status_user_system_key_unique").on(table.userId, table.systemKey)],
).enableRLS();

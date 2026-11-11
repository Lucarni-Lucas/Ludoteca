import { pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "../columns";

/** Las tiendas conocidas tienen `user_id` vacío y son de todos; las escritas a mano, de un solo usuario. */
export const store = pgTable(
  "store",
  {
    id: primaryId(),
    userId: uuid("user_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ...timestamps(),
  },
  // nulls not distinct: sin esto, dos tiendas conocidas con el mismo slug no chocarían.
  (table) => [unique("store_user_slug_unique").on(table.userId, table.slug).nullsNotDistinct()],
).enableRLS();

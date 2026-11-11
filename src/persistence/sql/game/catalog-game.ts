import { boolean, index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { CATALOG_SOURCES } from "../../../model/game/catalog";
import { hoursColumn, primaryId, timestamps } from "../columns";

export const catalogSourceEnum = pgEnum("catalog_source", CATALOG_SOURCES);

/** Compartido entre usuarios, salvo los juegos a mano: esos tienen `owner_id` y solo los ve su dueño. */
export const catalogGame = pgTable(
  "catalog_game",
  {
    id: primaryId(),
    igdbId: integer("igdb_id").unique(),
    source: catalogSourceEnum("source").notNull(),
    ownerId: uuid("owner_id"),
    title: text("title").notNull(),
    year: integer("year"),
    developer: text("developer"),
    coverUrl: text("cover_url"),
    pageUrl: text("page_url"),
    estimatedHours: hoursColumn("estimated_hours"),
    endless: boolean("endless").notNull().default(false),
    ...timestamps(),
  },
  (table) => [index("catalog_game_owner_id_idx").on(table.ownerId)],
).enableRLS();

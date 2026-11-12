import { boolean, date, index, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { hoursColumn, primaryId, scoreColumn, timestamps } from "../columns";
import { status } from "../status/status";
import { catalogGame } from "./catalog-game";

/** En `estimated_hours`, `endless` y `cover_url`, vacío significa «usá el dato del catálogo». */
export const libraryGame = pgTable(
  "library_game",
  {
    id: primaryId(),
    userId: uuid("user_id").notNull(),
    catalogGameId: uuid("catalog_game_id")
      .notNull()
      .references(() => catalogGame.id),
    statusId: uuid("status_id")
      .notNull()
      .references(() => status.id),
    statusSince: date("status_since", { mode: "string" }).notNull(),
    score: scoreColumn("score"),
    notInterested: boolean("not_interested").notNull().default(false),
    // En minutos, como copy.playtime_minutes; vacío si no hay total a mano.
    playedMinutesManual: integer("played_minutes_manual"),
    estimatedHours: hoursColumn("estimated_hours"),
    endless: boolean("endless"),
    coverUrl: text("cover_url"),
    ...timestamps(),
  },
  (table) => [
    unique("library_game_user_catalog_unique").on(table.userId, table.catalogGameId),
    index("library_game_catalog_game_id_idx").on(table.catalogGameId),
    index("library_game_status_id_idx").on(table.statusId),
  ],
).enableRLS();

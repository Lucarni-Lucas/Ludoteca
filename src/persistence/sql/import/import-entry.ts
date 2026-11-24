import { boolean, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { PLAY_ANSWERS } from "../../../model/import/import-entry";
import { primaryId, timestamps } from "../columns";
import { catalogGame } from "../game/catalog-game";
import { libraryGame } from "../game/library-game";

export const importPlayAnswerEnum = pgEnum("import_play_answer", PLAY_ANSWERS);

/**
 * Un juego a revisar. Las columnas de respuesta vacías son «mostrá la sugerencia»; con valor, el juego
 * está en «Listos para importar». Sin `igdb_id` es una fila que todavía no cruzó: Postgres no compara los vacíos.
 */
export const importEntry = pgTable(
  "import_entry",
  {
    id: primaryId(),
    userId: uuid("user_id").notNull(),
    igdbId: integer("igdb_id"),
    catalogGameId: uuid("catalog_game_id").references(() => catalogGame.id, { onDelete: "set null" }),
    multiplayerOnly: boolean("multiplayer_only").notNull().default(false),
    manualTitle: text("manual_title"),
    statusKey: text("status_key"),
    endlessAnswer: boolean("endless_answer"),
    playAnswer: importPlayAnswerEnum("play_answer"),
    excluded: boolean("excluded").notNull().default(false),
    libraryGameId: uuid("library_game_id").references(() => libraryGame.id, { onDelete: "set null" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [unique("import_entry_user_igdb_unique").on(table.userId, table.igdbId)],
).enableRLS();

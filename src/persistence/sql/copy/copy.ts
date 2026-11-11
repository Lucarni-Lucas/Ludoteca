import { date, index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { COPY_KINDS, LOST_REASONS } from "../../../model/copy/copy";
import { primaryId, timestamps } from "../columns";
import { libraryGame } from "../game/library-game";
import { store } from "../store/store";

export const copyKindEnum = pgEnum("copy_kind", COPY_KINDS);
export const lostReasonEnum = pgEnum("lost_reason", LOST_REASONS);

export const copy = pgTable(
  "copy",
  {
    id: primaryId(),
    userId: uuid("user_id").notNull(),
    // «Quitar de la biblioteca» depende de esta cascada.
    libraryGameId: uuid("library_game_id")
      .notNull()
      .references(() => libraryGame.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => store.id),
    kind: copyKindEnum("kind").notNull(),
    acquiredOn: date("acquired_on", { mode: "string" }),
    playtimeMinutes: integer("playtime_minutes"),
    familyOwner: text("family_owner"),
    lostAt: date("lost_at", { mode: "string" }),
    lostReason: lostReasonEnum("lost_reason"),
    ...timestamps(),
  },
  (table) => [
    index("copy_user_id_idx").on(table.userId),
    index("copy_library_game_id_idx").on(table.libraryGameId),
    index("copy_store_id_idx").on(table.storeId),
  ],
).enableRLS();

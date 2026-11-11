import { date, index, pgEnum, pgTable, uuid } from "drizzle-orm/pg-core";

import { JOURNAL_ENTRY_KINDS } from "../../../model/journal/journal-entry";
import { primaryId, timestamps } from "../columns";
import { libraryGame } from "../game/library-game";
import { status } from "../status/status";

export const journalEntryKindEnum = pgEnum("journal_entry_kind", JOURNAL_ENTRY_KINDS);

export const journalEntry = pgTable(
  "journal_entry",
  {
    id: primaryId(),
    userId: uuid("user_id").notNull(),
    // «Quitar de la biblioteca» depende de esta cascada.
    libraryGameId: uuid("library_game_id")
      .notNull()
      .references(() => libraryGame.id, { onDelete: "cascade" }),
    kind: journalEntryKindEnum("kind").notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    fromStatusId: uuid("from_status_id")
      .notNull()
      .references(() => status.id),
    toStatusId: uuid("to_status_id")
      .notNull()
      .references(() => status.id),
    ...timestamps(),
  },
  (table) => [
    index("journal_entry_user_id_idx").on(table.userId),
    index("journal_entry_library_game_id_idx").on(table.libraryGameId),
  ],
).enableRLS();

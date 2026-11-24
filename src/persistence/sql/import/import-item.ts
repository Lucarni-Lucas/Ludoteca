import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { type IgnStatus, IMPORT_SOURCES } from "../../../model/import/import-row";
import { type ImportCandidate, MATCH_STATES } from "../../../model/import/import-entry";
import { hoursColumn, primaryId, scoreColumn, timestamps } from "../columns";
import { copyKindEnum } from "../copy/copy";
import { store } from "../store/store";
import { importEntry } from "./import-entry";

export const importSourceEnum = pgEnum("import_source", IMPORT_SOURCES);
export const importMatchStateEnum = pgEnum("import_match_state", MATCH_STATES);

/** Una fila de una fuente. Las confirmadas quedan como historia: reimportar las reconoce y no las toca. */
export const importItem = pgTable(
  "import_item",
  {
    id: primaryId(),
    userId: uuid("user_id").notNull(),
    source: importSourceEnum("source").notNull(),
    sourceKey: text("source_key").notNull(),
    title: text("title").notNull(),
    altTitles: text("alt_titles").array().notNull(),
    year: integer("year"),
    storeId: uuid("store_id").references(() => store.id),
    storeGameId: text("store_game_id"),
    playtimeMinutes: integer("playtime_minutes"),
    ignStatuses: text("ign_statuses").array().$type<IgnStatus[]>().notNull(),
    ignScore: scoreColumn("ign_score"),
    hltbMainHours: hoursColumn("hltb_main_hours"),
    steamAppId: text("steam_app_id"),
    matchState: importMatchStateEnum("match_state").notNull().default("pending"),
    candidates: jsonb("candidates").$type<readonly ImportCandidate[]>().notNull(),
    entryId: uuid("entry_id").references(() => importEntry.id, { onDelete: "set null" }),
    // Vacío es «el tipo sugerido».
    copyKind: copyKindEnum("copy_kind"),
    excluded: boolean("excluded").notNull().default(false),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    unique("import_item_user_source_key_unique").on(table.userId, table.source, table.sourceKey),
    index("import_item_entry_id_idx").on(table.entryId),
  ],
).enableRLS();

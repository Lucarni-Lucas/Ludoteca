import type { CatalogGameData } from "@/model/game/catalog";
import type { ImportedCopy, ImportedGameValues } from "@/model/import/confirm";
import type {
  EntryAnswers,
  EntryCatalog,
  ImportEntry,
  ImportItem,
  NewImportItem,
} from "@/model/import/import-entry";
import type { Store } from "@/model/store/store";
import type { catalogGame } from "@/persistence/sql/game/catalog-game";
import type { importEntry } from "@/persistence/sql/import/import-entry";
import type { importItem } from "@/persistence/sql/import/import-item";

type ImportItemRow = typeof importItem.$inferSelect;
type NewImportItemRow = typeof importItem.$inferInsert;
type ImportEntryRow = typeof importEntry.$inferSelect;
type CatalogRow = typeof catalogGame.$inferSelect;

/** Las columnas que cambia una reimportación; las decisiones y el cruce no están acá. */
export type ImportItemSourceFields = Pick<
  NewImportItemRow,
  | "title"
  | "altTitles"
  | "year"
  | "storeId"
  | "storeGameId"
  | "playtimeMinutes"
  | "ignStatuses"
  | "ignScore"
  | "hltbMainHours"
  | "steamAppId"
>;

export function toImportItemSourceFields(value: NewImportItem): ImportItemSourceFields {
  return {
    title: value.title,
    altTitles: [...value.altTitles],
    year: value.year,
    storeId: value.storeId,
    storeGameId: value.storeGameId,
    playtimeMinutes: value.playtimeMinutes,
    ignStatuses: [...value.ignStatuses],
    ignScore: value.ignScore,
    hltbMainHours: value.hltbMainHours,
    steamAppId: value.steamAppId,
  };
}

export function toNewImportItemRow(userId: string, value: NewImportItem): NewImportItemRow {
  return {
    userId,
    source: value.source,
    sourceKey: value.sourceKey,
    candidates: [],
    ...toImportItemSourceFields(value),
  };
}

export function toImportItem(row: ImportItemRow, store: Store | null): ImportItem {
  return {
    id: row.id,
    source: row.source,
    sourceKey: row.sourceKey,
    title: row.title,
    altTitles: row.altTitles,
    year: row.year,
    store,
    storeGameId: row.storeGameId,
    playtimeMinutes: row.playtimeMinutes,
    ignStatuses: row.ignStatuses,
    ignScore: row.ignScore,
    hltbMainHours: row.hltbMainHours,
    steamAppId: row.steamAppId,
    matchState: row.matchState,
    candidates: row.candidates,
    chosenIgdbId: row.chosenIgdbId,
    entryId: row.entryId,
    copyKind: row.copyKind,
    excluded: row.excluded,
  };
}

function toEntryAnswers(row: ImportEntryRow): EntryAnswers {
  return {
    statusKey: row.statusKey,
    endlessAnswer: row.endlessAnswer,
    playAnswer: row.playAnswer,
    excluded: row.excluded,
    manualTitle: row.manualTitle,
  };
}

function toEntryCatalog(row: CatalogRow): EntryCatalog {
  return {
    title: row.title,
    year: row.year,
    coverUrl: row.coverUrl,
    estimatedHours: row.estimatedHours,
    endless: row.endless,
  };
}

export function toImportEntry(
  row: ImportEntryRow,
  catalog: CatalogRow | null,
  items: readonly ImportItem[],
): ImportEntry {
  return {
    id: row.id,
    igdbId: row.igdbId,
    catalogGameId: row.catalogGameId,
    catalog: catalog ? toEntryCatalog(catalog) : null,
    multiplayerOnly: row.multiplayerOnly,
    answers: toEntryAnswers(row),
    libraryGameId: row.libraryGameId,
    items,
  };
}

export function toEntryAnswersUpdate(answers: Partial<EntryAnswers>): Partial<ImportEntryRow> {
  return {
    statusKey: answers.statusKey,
    endlessAnswer: answers.endlessAnswer,
    playAnswer: answers.playAnswer,
    excluded: answers.excluded,
    manualTitle: answers.manualTitle,
  };
}

export function toImportedLibraryGameRow(userId: string, catalogGameId: string, values: ImportedGameValues) {
  return {
    userId,
    catalogGameId,
    statusId: values.statusId,
    statusSince: values.statusSince,
    score: values.score,
    notInterested: values.notInterested,
    endless: values.endless,
    hltbHours: values.hltbHours,
  };
}

export function toImportedCopyRow(userId: string, libraryGameId: string, value: ImportedCopy) {
  return {
    userId,
    libraryGameId,
    storeId: value.storeId,
    kind: value.kind,
    storeGameId: value.storeGameId,
    playtimeMinutes: value.playtimeMinutes,
    origin: "import" as const,
  };
}

/** Lo que se sabe de un juego cargado a mano desde «No lo encontré»: su título y su año. */
export function toManualImportData(title: string, year: number | null): CatalogGameData {
  return { title, year, developer: null, coverUrl: null, pageUrl: null, estimatedHours: null, endless: false };
}

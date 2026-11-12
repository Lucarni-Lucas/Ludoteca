import type { Copy } from "@/model/copy/copy";
import type { CatalogGameData, IgdbGameData } from "@/model/game/catalog";
import type { LibraryGame } from "@/model/game/library-game";
import type { Status } from "@/model/status/status";
import type { catalogGame } from "@/persistence/sql/game/catalog-game";
import type { libraryGame } from "@/persistence/sql/game/library-game";

type LibraryRow = typeof libraryGame.$inferSelect;
type CatalogRow = typeof catalogGame.$inferSelect;
type NewCatalogRow = typeof catalogGame.$inferInsert;

export type GameRow = Readonly<{
  library: LibraryRow;
  catalog: CatalogRow;
}>;

export function toLibraryGame({ library, catalog }: GameRow, status: Status, copies: readonly Copy[]): LibraryGame {
  return {
    id: library.id,
    catalogGameId: catalog.id,
    igdbId: catalog.igdbId,
    source: catalog.source,
    title: catalog.title,
    year: catalog.year,
    developer: catalog.developer,
    pageUrl: catalog.pageUrl,
    catalog: {
      estimatedHours: catalog.estimatedHours,
      endless: catalog.endless,
      coverUrl: catalog.coverUrl,
    },
    corrections: {
      estimatedHours: library.estimatedHours,
      endless: library.endless,
      coverUrl: library.coverUrl,
    },
    status,
    statusSince: library.statusSince,
    score: library.score,
    notInterested: library.notInterested,
    manualPlayedMinutes: library.playedMinutesManual,
    addedAt: library.createdAt.toISOString(),
    copies,
  };
}

function toCatalogData(data: CatalogGameData) {
  return {
    title: data.title,
    year: data.year,
    developer: data.developer,
    coverUrl: data.coverUrl,
    pageUrl: data.pageUrl,
    estimatedHours: data.estimatedHours,
    endless: data.endless,
  };
}

export function toIgdbCatalogRow(data: IgdbGameData): NewCatalogRow {
  return { ...toCatalogData(data), igdbId: data.igdbId, source: "igdb" };
}

export function toManualCatalogRow(ownerId: string, data: CatalogGameData): NewCatalogRow {
  return { ...toCatalogData(data), ownerId, source: "manual" };
}

export function toCatalogUpdate(data: IgdbGameData) {
  return toCatalogData(data);
}

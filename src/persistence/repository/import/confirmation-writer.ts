import { and, eq, inArray } from "drizzle-orm";

import type { ConfirmedGame, ImportConfirmationPlan } from "@/model/import/confirm";
import type { Database } from "@/persistence/db";
import { toManualCatalogRow } from "@/persistence/mapper/game/game-mapper";
import {
  toImportedCopyRow,
  toImportedLibraryGameRow,
  toManualImportData,
} from "@/persistence/mapper/import/import-mapper";
import { copy } from "@/persistence/sql/copy/copy";
import { catalogGame } from "@/persistence/sql/game/catalog-game";
import { libraryGame } from "@/persistence/sql/game/library-game";
import { importEntry } from "@/persistence/sql/import/import-entry";
import { importItem } from "@/persistence/sql/import/import-item";
import { chunk } from "@/shared/chunk";

const INSERT_CHUNK_SIZE = 500;

// `title` no admite vacío: queda en blanco.
const CONFIRMED_ITEM_CLEANUP = {
  title: "",
  altTitles: [],
  year: null,
  storeId: null,
  storeGameId: null,
  playtimeMinutes: null,
  ignStatuses: [],
  ignScore: null,
  hltbMainHours: null,
  steamAppId: null,
  candidates: [],
  chosenIgdbId: null,
  copyKind: null,
} satisfies Partial<typeof importItem.$inferInsert>;

const CONFIRMED_ENTRY_CLEANUP = {
  statusId: null,
  endlessAnswer: null,
  playAnswer: null,
  manualTitle: null,
  multiplayerOnly: false,
} satisfies Partial<typeof importEntry.$inferInsert>;

/** Los juegos de IGDB de una vez; uno que ya estaba (otra pestaña lo agregó) se reutiliza sin tocarlo. */
async function insertIgdbGames(tx: Database, userId: string, games: readonly ConfirmedGame[]): Promise<Map<string, string>> {
  const rows = games.flatMap(({ target }) =>
    target.kind === "igdb" ? [toImportedLibraryGameRow(userId, target.catalogGameId, target.values)] : [],
  );
  const byCatalog = new Map<string, string>();

  for (const values of chunk(rows, INSERT_CHUNK_SIZE)) {
    await tx.insert(libraryGame).values(values).onConflictDoNothing({ target: [libraryGame.userId, libraryGame.catalogGameId] });
    const saved = await tx
      .select({ id: libraryGame.id, catalogGameId: libraryGame.catalogGameId })
      .from(libraryGame)
      .where(and(eq(libraryGame.userId, userId), inArray(libraryGame.catalogGameId, values.map((row) => row.catalogGameId))));
    saved.forEach((row) => byCatalog.set(row.catalogGameId, row.id));
  }

  return byCatalog;
}

/** Un juego cargado a mano tiene su propia fila de catálogo, como «Agregar a mano». */
async function insertManualGame(
  tx: Database,
  userId: string,
  target: Extract<ConfirmedGame["target"], { kind: "manual" }>,
): Promise<string> {
  const [catalogRow] = await tx
    .insert(catalogGame)
    .values(toManualCatalogRow(userId, toManualImportData(target.title, target.year)))
    .returning({ id: catalogGame.id });
  const [libraryRow] = await tx
    .insert(libraryGame)
    .values(toImportedLibraryGameRow(userId, catalogRow.id, target.values))
    .returning({ id: libraryGame.id });

  return libraryRow.id;
}

async function gameIdOf(
  tx: Database,
  userId: string,
  target: ConfirmedGame["target"],
  byCatalog: ReadonlyMap<string, string>,
): Promise<string | undefined> {
  if (target.kind === "existing") {
    return target.libraryGameId;
  }

  return target.kind === "igdb" ? byCatalog.get(target.catalogGameId) : insertManualGame(tx, userId, target);
}

async function resolveGameIds(tx: Database, userId: string, games: readonly ConfirmedGame[]): Promise<Map<string, string>> {
  const byCatalog = await insertIgdbGames(tx, userId, games);
  const byEntry = new Map<string, string>();

  for (const game of games) {
    const gameId = await gameIdOf(tx, userId, game.target, byCatalog);

    if (gameId) {
      byEntry.set(game.entryId, gameId);
    }
  }

  return byEntry;
}

async function insertCopies(
  tx: Database,
  userId: string,
  games: readonly ConfirmedGame[],
  gameIds: ReadonlyMap<string, string>,
): Promise<void> {
  const rows = games.flatMap((game) => {
    const libraryGameId = gameIds.get(game.entryId);
    return libraryGameId ? game.copies.map((value) => toImportedCopyRow(userId, libraryGameId, value)) : [];
  });

  for (const values of chunk(rows, INSERT_CHUNK_SIZE)) {
    // Una copia que ya estaba (misma tienda e ID en la tienda) no se duplica.
    await tx.insert(copy).values(values).onConflictDoNothing();
  }
}

async function markConfirmed(
  tx: Database,
  userId: string,
  entryIds: readonly string[],
  gameIds: ReadonlyMap<string, string>,
): Promise<void> {
  const confirmedAt = new Date();

  for (const ids of chunk(entryIds, INSERT_CHUNK_SIZE)) {
    await tx
      .update(importEntry)
      .set({ confirmedAt })
      .where(and(eq(importEntry.userId, userId), inArray(importEntry.id, ids)));
    await tx
      .update(importItem)
      .set({ confirmedAt })
      .where(and(eq(importItem.userId, userId), inArray(importItem.entryId, ids)));
  }

  for (const [entryId, libraryGameId] of gameIds) {
    await tx
      .update(importEntry)
      .set({ libraryGameId })
      .where(and(eq(importEntry.userId, userId), eq(importEntry.id, entryId)));
  }
}

/**
 * Lo confirmado guarda solo lo que necesita «Reimportar sin duplicar»: la fila, su fuente, su ID en la
 * fuente y en qué quedó; el juego, su juego de IGDB y el de la biblioteca (design.md §18).
 */
async function cleanConfirmed(tx: Database, userId: string, entryIds: readonly string[]): Promise<void> {
  for (const ids of chunk(entryIds, INSERT_CHUNK_SIZE)) {
    await tx
      .update(importItem)
      .set(CONFIRMED_ITEM_CLEANUP)
      .where(and(eq(importItem.userId, userId), inArray(importItem.entryId, ids)));
    await tx
      .update(importEntry)
      .set(CONFIRMED_ENTRY_CLEANUP)
      .where(and(eq(importEntry.userId, userId), inArray(importEntry.id, ids)));
  }
}

/** Todo en una transacción: la confirmación entra entera o no entra. Sin entradas del diario (design.md §11). */
export function writeConfirmation(db: Database, userId: string, plan: ImportConfirmationPlan): Promise<void> {
  return db.transaction(async (tx) => {
    const gameIds = await resolveGameIds(tx, userId, plan.games);
    await insertCopies(tx, userId, plan.games, gameIds);
    await markConfirmed(tx, userId, plan.entryIds, gameIds);
    await cleanConfirmed(tx, userId, plan.entryIds);
  });
}

import { and, asc, eq, inArray, isNotNull, isNull, max } from "drizzle-orm";

import type { ImportConfirmationPlan } from "@/model/import/confirm";
import type {
  DecisionWrite,
  ImportCandidate,
  ImportEntry,
  ImportItem,
  ItemMatch,
  LibraryMatch,
  LibraryTitle,
  MatchedGame,
  NewImportItem,
  OpenReview,
  SourceSummary,
} from "@/model/import/import-entry";
import { NO_ANSWERS } from "@/model/import/import-entry";
import type { Database } from "@/persistence/db";
import {
  type ImportItemSourceFields,
  toEntryAnswersUpdate,
  toImportEntry,
  toImportItem,
  toImportItemSourceFields,
  toNewImportItemRow,
} from "@/persistence/mapper/import/import-mapper";
import { toStore } from "@/persistence/mapper/store/store-mapper";
import { copy } from "@/persistence/sql/copy/copy";
import { catalogGame } from "@/persistence/sql/game/catalog-game";
import { libraryGame } from "@/persistence/sql/game/library-game";
import { importEntry } from "@/persistence/sql/import/import-entry";
import { importItem } from "@/persistence/sql/import/import-item";
import { store } from "@/persistence/sql/store/store";
import { chunk } from "@/shared/chunk";

import { upsertIgdbCatalogs } from "../game/catalog-writer";
import { writeConfirmation } from "./confirmation-writer";

/** Muy por debajo del tope de parámetros de Postgres, aun con cientos de juegos de Steam. */
const INSERT_CHUNK_SIZE = 500;

export type UpsertItemsResult = Readonly<{ inserted: number; updated: number }>;

export type ImportRepository = Readonly<{
  upsertItems(userId: string, items: readonly NewImportItem[]): Promise<UpsertItemsResult>;
  listPendingItems(userId: string, limit: number): Promise<readonly ImportItem[]>;
  saveMatches(userId: string, matches: readonly ItemMatch[]): Promise<void>;
  listOpenReview(userId: string): Promise<OpenReview>;
  saveDecision(userId: string, entryIds: readonly string[], decision: DecisionWrite): Promise<void>;
  clearDecision(userId: string, entryIds: readonly string[]): Promise<void>;
  /** Todas las filas sin confirmar, también las pendientes: entre ellas se busca el juego base de un soundtrack. */
  listOpenItems(userId: string): Promise<readonly ImportItem[]>;
  summarizeSources(userId: string): Promise<readonly SourceSummary[]>;
  listLibraryTitles(userId: string): Promise<readonly LibraryTitle[]>;
  /** El candidato elegido (o el juego buscado con otro nombre) pasa a ser el juego de ese juego a revisar. */
  matchEntry(userId: string, entryId: string, game: MatchedGame, chosen: ImportCandidate): Promise<void>;
  applyConfirmation(userId: string, plan: ImportConfirmationPlan): Promise<void>;
  /** «Empezar de nuevo» y el vencimiento: borra todo lo que no se confirmó (design.md §18). */
  discardOpenReview(userId: string): Promise<void>;
  /** El `updated_at` más reciente de las filas sin confirmar; vacío si no hay revisión abierta. */
  lastOpenActivityAt(userId: string): Promise<Date | null>;
  /** El usuario tocó la importación: renueva las filas sin confirmar para que no venzan. */
  touchOpenReview(userId: string): Promise<void>;
}>;

type ItemRow = typeof importItem.$inferSelect;

function itemKey(source: string, sourceKey: string): string {
  return `${source}\u0000${sourceKey}`;
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Solo lo que cambió: reimportar el mismo archivo no escribe nada. */
function changedFields(row: ItemRow, fields: ImportItemSourceFields): Partial<ImportItemSourceFields> | null {
  const changed = Object.fromEntries(
    Object.entries(fields).filter(([name, value]) => !sameValue(row[name as keyof ItemRow], value)),
  );

  return Object.keys(changed).length > 0 ? changed : null;
}

function openItemsOf(userId: string) {
  return and(eq(importItem.userId, userId), isNull(importItem.confirmedAt));
}

function openEntries(userId: string, entryIds: readonly string[]) {
  return and(eq(importEntry.userId, userId), inArray(importEntry.id, [...entryIds]), isNull(importEntry.confirmedAt));
}

function itemsOfEntries(userId: string, entryIds: readonly string[]) {
  return and(openItemsOf(userId), inArray(importItem.entryId, [...entryIds]));
}

async function updateItems(tx: Database, userId: string, itemIds: readonly string[], values: Partial<ItemRow>) {
  if (itemIds.length > 0) {
    await tx
      .update(importItem)
      .set(values)
      .where(and(eq(importItem.userId, userId), inArray(importItem.id, [...itemIds])));
  }
}

function uniqueGames(matches: readonly ItemMatch[]): readonly MatchedGame[] {
  const games = new Map<number, MatchedGame>();

  for (const match of matches) {
    if (match.kind === "matched") {
      games.set(match.game.igdbId, match.game);
    }
  }

  return [...games.values()];
}

/** Un juego de IGDB tiene un solo juego a revisar: si ya se confirmó, vuelve a abrirse para sumar copias. */
async function entriesForGames(
  tx: Database,
  userId: string,
  games: readonly MatchedGame[],
): Promise<ReadonlyMap<number, string>> {
  const catalogIds = await upsertIgdbCatalogs(tx, games);
  const igdbIds = games.map((game) => game.igdbId);

  await tx
    .insert(importEntry)
    .values(
      games.map((game) => ({
        userId,
        igdbId: game.igdbId,
        catalogGameId: catalogIds.get(game.igdbId) ?? null,
        multiplayerOnly: game.multiplayerOnly,
      })),
    )
    .onConflictDoNothing({ target: [importEntry.userId, importEntry.igdbId] });

  await tx
    .update(importEntry)
    .set({ confirmedAt: null })
    .where(and(eq(importEntry.userId, userId), inArray(importEntry.igdbId, igdbIds)));

  const rows = await tx
    .select({ id: importEntry.id, igdbId: importEntry.igdbId })
    .from(importEntry)
    .where(and(eq(importEntry.userId, userId), inArray(importEntry.igdbId, igdbIds)));

  return new Map(rows.flatMap(({ id, igdbId }) => (igdbId === null ? [] : [[igdbId, id] as const])));
}

async function saveMatched(tx: Database, userId: string, matches: readonly ItemMatch[]): Promise<void> {
  const games = uniqueGames(matches);

  if (games.length === 0) {
    return;
  }

  const entryByGame = await entriesForGames(tx, userId, games);
  const itemsByEntry = new Map<string, string[]>();

  for (const match of matches) {
    const entryId = match.kind === "matched" ? entryByGame.get(match.game.igdbId) : undefined;

    if (entryId) {
      itemsByEntry.set(entryId, [...(itemsByEntry.get(entryId) ?? []), match.itemId]);
    }
  }

  for (const [entryId, itemIds] of itemsByEntry) {
    await updateItems(tx, userId, itemIds, { entryId, matchState: "matched" });
  }
}

/** Una fila sin cruce o con candidatos tiene su propio juego a revisar, para guardar lo que se decida. */
type UnmatchedMatch = Extract<ItemMatch, { kind: "candidates" | "not_found" }>;

function unmatchedValues(match: UnmatchedMatch, entryId: string): Partial<ItemRow> {
  const candidates = match.kind === "candidates" ? [...match.candidates] : [];
  return { entryId, matchState: match.kind, candidates };
}

/** Los juegos a revisar abiertos del usuario entre los pedidos: uno ajeno o ya confirmado no recibe filas. */
async function ownOpenEntries(tx: Database, userId: string, entryIds: readonly string[]): Promise<ReadonlySet<string>> {
  if (entryIds.length === 0) {
    return new Set();
  }

  const rows = await tx.select({ id: importEntry.id }).from(importEntry).where(openEntries(userId, entryIds));
  return new Set(rows.map((row) => row.id));
}

async function createEntryFor(tx: Database, userId: string, match: UnmatchedMatch): Promise<string> {
  // Lo que no es un juego nace en «No importar»: es una decisión del cruce, que se ve y se deshace (design.md §8).
  const excluded = match.kind === "not_found" && match.notAGame === true;
  const [entry] = await tx.insert(importEntry).values({ userId, excluded }).returning({ id: importEntry.id });
  await updateItems(tx, userId, [match.itemId], unmatchedValues(match, entry.id));
  return entry.id;
}

/**
 * Una fila sin cruce o con candidatos tiene su juego a revisar, para guardar lo que se decida. Si el modelo la
 * juntó con otra del mismo nombre (design.md §10), va al de esa; si no, crea el suyo.
 */
async function saveUnmatched(tx: Database, userId: string, matches: readonly ItemMatch[]): Promise<void> {
  const unmatched = matches.filter((match): match is UnmatchedMatch => match.kind === "candidates" || match.kind === "not_found");
  const owned = await ownOpenEntries(tx, userId, unmatched.flatMap((match) => match.joinEntryId ?? []));
  const created = new Map<string, string>();
  const followers: UnmatchedMatch[] = [];

  for (const match of unmatched) {
    if (match.joinEntryId !== undefined && owned.has(match.joinEntryId)) {
      await updateItems(tx, userId, [match.itemId], unmatchedValues(match, match.joinEntryId));
    } else if (match.joinItemId === undefined) {
      created.set(match.itemId, await createEntryFor(tx, userId, match));
    } else {
      followers.push(match);
    }
  }

  for (const match of followers) {
    const entryId = created.get(match.joinItemId ?? "");

    if (entryId) {
      await updateItems(tx, userId, [match.itemId], unmatchedValues(match, entryId));
    } else {
      await createEntryFor(tx, userId, match);
    }
  }
}

/** Va después de las otras: el juego base puede haber cruzado en esta misma tanda. */
async function saveAbsorbed(tx: Database, userId: string, matches: readonly ItemMatch[]): Promise<void> {
  const absorbed = matches.filter((match) => match.kind === "absorbed");
  const baseIds = absorbed.flatMap((match) => (match.baseItemId ? [match.baseItemId] : []));
  const bases =
    baseIds.length === 0
      ? []
      : await tx
          .select({ id: importItem.id, entryId: importItem.entryId })
          .from(importItem)
          .where(and(eq(importItem.userId, userId), inArray(importItem.id, baseIds)));
  const entryOfBase = new Map(bases.map(({ id, entryId }) => [id, entryId]));

  for (const match of absorbed) {
    const entryId = match.baseItemId ? (entryOfBase.get(match.baseItemId) ?? null) : null;
    // Colgada de un juego que ya está en la biblioteca, no queda nada por revisar ni por confirmar.
    const confirmedAt = entryId === null ? new Date() : null;
    await updateItems(tx, userId, [match.itemId], { entryId, matchState: "absorbed", confirmedAt });
  }
}

async function listLibraryMatches(
  db: Database,
  userId: string,
  catalogGameIds: readonly string[],
): Promise<readonly LibraryMatch[]> {
  if (catalogGameIds.length === 0) {
    return [];
  }

  const games = await db
    .select({ id: libraryGame.id, catalogGameId: libraryGame.catalogGameId })
    .from(libraryGame)
    .where(and(eq(libraryGame.userId, userId), inArray(libraryGame.catalogGameId, [...catalogGameIds])));

  if (games.length === 0) {
    return [];
  }

  const copies = await db
    .select({ libraryGameId: copy.libraryGameId, storeId: copy.storeId, storeGameId: copy.storeGameId })
    .from(copy)
    .where(and(eq(copy.userId, userId), inArray(copy.libraryGameId, games.map((game) => game.id))));

  return games.map((game) => ({
    catalogGameId: game.catalogGameId,
    libraryGameId: game.id,
    copies: copies
      .filter((owned) => owned.libraryGameId === game.id)
      .map(({ storeId, storeGameId }) => ({ storeId, storeGameId })),
  }));
}

function selectOpenItems(db: Database, userId: string) {
  return db
    .select({ item: importItem, store })
    .from(importItem)
    .leftJoin(store, eq(importItem.storeId, store.id))
    .where(openItemsOf(userId))
    .orderBy(asc(importItem.createdAt), asc(importItem.sourceKey));
}

async function listItems(db: Database, userId: string): Promise<readonly ImportItem[]> {
  const rows = await selectOpenItems(db, userId);
  return rows.map((row) => toImportItem(row.item, row.store ? toStore(row.store) : null));
}

/**
 * Si el juego elegido ya tiene su juego a revisar (llegó por otra fuente), las filas se mudan ahí y este se
 * borra: un juego de IGDB tiene uno solo.
 */
async function moveOrMatch(tx: Database, userId: string, entryId: string, game: MatchedGame): Promise<string> {
  const catalogIds = await upsertIgdbCatalogs(tx, [game]);
  const [existing] = await tx
    .select({ id: importEntry.id })
    .from(importEntry)
    .where(and(eq(importEntry.userId, userId), eq(importEntry.igdbId, game.igdbId)))
    .limit(1);

  if (existing && existing.id !== entryId) {
    await tx
      .update(importEntry)
      .set({ confirmedAt: null })
      .where(and(eq(importEntry.userId, userId), eq(importEntry.id, existing.id)));
    await tx.update(importItem).set({ entryId: existing.id }).where(and(eq(importItem.userId, userId), eq(importItem.entryId, entryId)));
    await tx.delete(importEntry).where(and(eq(importEntry.userId, userId), eq(importEntry.id, entryId)));
    return existing.id;
  }

  await tx
    .update(importEntry)
    .set({ igdbId: game.igdbId, catalogGameId: catalogIds.get(game.igdbId) ?? null, multiplayerOnly: game.multiplayerOnly })
    .where(and(eq(importEntry.userId, userId), eq(importEntry.id, entryId)));
  return entryId;
}

/**
 * Cada fila elegida vuelve a un juego a revisar propio, sin juego de IGDB, y con eso a «¿Cuál de estos es?»
 * o a «No lo encontré». Un juego a revisar que se queda sin ninguna fila se borra: lo tomó la elección.
 */
async function unchooseItems(tx: Database, userId: string, entryIds: readonly string[]): Promise<void> {
  const chosen = await tx
    .select({ id: importItem.id, chosenIgdbId: importItem.chosenIgdbId })
    .from(importItem)
    .where(and(itemsOfEntries(userId, entryIds), isNotNull(importItem.chosenIgdbId)));

  if (chosen.length === 0) {
    return;
  }

  // Las filas que eligieron el mismo juego vuelven juntas: el mismo nombre sigue siendo una pregunta (design.md §10).
  const byChoice = Map.groupBy(chosen, (row) => row.chosenIgdbId);
  const fresh = await tx
    .insert(importEntry)
    .values([...byChoice.keys()].map(() => ({ userId })))
    .returning({ id: importEntry.id });

  for (const [index, rows] of [...byChoice.values()].entries()) {
    await updateItems(tx, userId, rows.map((row) => row.id), { entryId: fresh[index].id, chosenIgdbId: null });
  }

  const stillUsed = await tx
    .select({ entryId: importItem.entryId })
    .from(importItem)
    .where(and(eq(importItem.userId, userId), inArray(importItem.entryId, [...entryIds])));
  const empty = entryIds.filter((entryId) => !stillUsed.some((row) => row.entryId === entryId));

  if (empty.length > 0) {
    await tx.delete(importEntry).where(openEntries(userId, empty));
  }
}

function groupByEntry(items: readonly ImportItem[]): ReadonlyMap<string, ImportItem[]> {
  const byEntry = new Map<string, ImportItem[]>();

  for (const item of items) {
    if (item.entryId !== null) {
      byEntry.set(item.entryId, [...(byEntry.get(item.entryId) ?? []), item]);
    }
  }

  return byEntry;
}

export function createImportRepository(db: Database): ImportRepository {
  return {
    upsertItems(userId, items) {
      if (items.length === 0) {
        return Promise.resolve({ inserted: 0, updated: 0 });
      }

      return db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(importItem)
          .where(and(eq(importItem.userId, userId), inArray(importItem.sourceKey, items.map((item) => item.sourceKey))));
        const byKey = new Map(existing.map((row) => [itemKey(row.source, row.sourceKey), row]));
        const fresh = items.filter((item) => !byKey.has(itemKey(item.source, item.sourceKey)));
        let updated = 0;

        for (const rows of chunk(fresh, INSERT_CHUNK_SIZE)) {
          await tx
            .insert(importItem)
            .values(rows.map((item) => toNewImportItemRow(userId, item)))
            .onConflictDoNothing({ target: [importItem.userId, importItem.source, importItem.sourceKey] });
        }

        for (const item of items) {
          const row = byKey.get(itemKey(item.source, item.sourceKey));
          // Una fila confirmada no se toca: «el resto queda igual».
          const changes = row && row.confirmedAt === null ? changedFields(row, toImportItemSourceFields(item)) : null;

          if (row && changes) {
            await updateItems(tx, userId, [row.id], changes);
            updated += 1;
          }
        }

        return { inserted: fresh.length, updated };
      });
    },

    async listPendingItems(userId, limit) {
      const rows = await db
        .select({ item: importItem, store })
        .from(importItem)
        .leftJoin(store, eq(importItem.storeId, store.id))
        .where(and(openItemsOf(userId), eq(importItem.matchState, "pending")))
        .orderBy(asc(importItem.createdAt), asc(importItem.sourceKey))
        .limit(limit);

      return rows.map((row) => toImportItem(row.item, row.store ? toStore(row.store) : null));
    },

    saveMatches(userId, matches) {
      return db.transaction(async (tx) => {
        await saveMatched(tx, userId, matches);
        await saveUnmatched(tx, userId, matches);
        await saveAbsorbed(tx, userId, matches);
      });
    },

    async listOpenReview(userId) {
      const [entryRows, items] = await Promise.all([
        db
          .select({ entry: importEntry, catalog: catalogGame })
          .from(importEntry)
          .leftJoin(catalogGame, eq(importEntry.catalogGameId, catalogGame.id))
          .where(and(eq(importEntry.userId, userId), isNull(importEntry.confirmedAt)))
          .orderBy(asc(importEntry.createdAt), asc(importEntry.id)),
        listItems(db, userId),
      ]);
      const itemsByEntry = groupByEntry(items);
      const entries: ImportEntry[] = entryRows.flatMap(({ entry, catalog }) => {
        const entryItems = itemsByEntry.get(entry.id) ?? [];
        return entryItems.length > 0 ? [toImportEntry(entry, catalog, entryItems)] : [];
      });
      const catalogIds = entries.flatMap((entry) => (entry.catalogGameId ? [entry.catalogGameId] : []));

      return {
        entries,
        library: await listLibraryMatches(db, userId, catalogIds),
        pendingCount: items.filter((item) => item.matchState === "pending").length,
        itemCount: items.length,
      };
    },

    saveDecision(userId, entryIds, decision) {
      return db.transaction(async (tx) => {
        if (decision.answers) {
          await tx.update(importEntry).set(toEntryAnswersUpdate(decision.answers)).where(openEntries(userId, entryIds));
        }

        if (decision.copies) {
          const { storeId, copyKind, excluded } = decision.copies;
          await tx
            .update(importItem)
            .set({ copyKind, excluded })
            .where(and(itemsOfEntries(userId, entryIds), eq(importItem.storeId, storeId)));
        }
      });
    },

    clearDecision(userId, entryIds) {
      return db.transaction(async (tx) => {
        await tx.update(importEntry).set(toEntryAnswersUpdate(NO_ANSWERS)).where(openEntries(userId, entryIds));
        await tx.update(importItem).set({ copyKind: null, excluded: false }).where(itemsOfEntries(userId, entryIds));
        await unchooseItems(tx, userId, entryIds);
      });
    },

    listOpenItems(userId) {
      return listItems(db, userId);
    },

    async summarizeSources(userId) {
      // Solo la revisión abierta: después de confirmar todo o de empezar de nuevo, vuelve «Subir archivo».
      const rows = await db
        .select({ source: importItem.source, updatedAt: importItem.updatedAt })
        .from(importItem)
        .where(openItemsOf(userId));
      const bySource = new Map<SourceSummary["source"], { itemCount: number; last: Date }>();

      for (const { source, updatedAt } of rows) {
        const current = bySource.get(source);
        bySource.set(source, {
          itemCount: (current?.itemCount ?? 0) + 1,
          last: current && current.last > updatedAt ? current.last : updatedAt,
        });
      }

      return [...bySource].map(([source, { itemCount, last }]) => ({ source, itemCount, lastReadAt: last.toISOString() }));
    },

    async listLibraryTitles(userId) {
      const rows = await db
        .select({ id: libraryGame.id, title: catalogGame.title, storeId: copy.storeId })
        .from(libraryGame)
        .innerJoin(catalogGame, eq(libraryGame.catalogGameId, catalogGame.id))
        .innerJoin(copy, eq(copy.libraryGameId, libraryGame.id))
        .where(eq(libraryGame.userId, userId));
      const byGame = new Map<string, { title: string; storeIds: string[] }>();

      for (const { id, title, storeId } of rows) {
        const game = byGame.get(id) ?? { title, storeIds: [] };
        game.storeIds.push(storeId);
        byGame.set(id, game);
      }

      return [...byGame.values()];
    },

    matchEntry(userId, entryId, game, chosen) {
      return db.transaction(async (tx) => {
        const items = await tx.select().from(importItem).where(itemsOfEntries(userId, [entryId]));
        const targetId = await moveOrMatch(tx, userId, entryId, game);

        // El cruce (`match_state` y `candidates`) queda como estaba: «Volver a revisar» lo necesita (design.md §4).
        await updateItems(
          tx,
          userId,
          items.map((item) => item.id),
          { entryId: targetId, chosenIgdbId: chosen.igdbId },
        );
      });
    },

    applyConfirmation(userId, plan) {
      return writeConfirmation(db, userId, plan);
    },

    discardOpenReview(userId) {
      // Una fila confirmada que apuntaba a un juego a revisar borrado queda sin él (`on delete set null`).
      return db.transaction(async (tx) => {
        await tx.delete(importItem).where(openItemsOf(userId));
        await tx.delete(importEntry).where(and(eq(importEntry.userId, userId), isNull(importEntry.confirmedAt)));
      });
    },

    async lastOpenActivityAt(userId) {
      const [row] = await db.select({ last: max(importItem.updatedAt) }).from(importItem).where(openItemsOf(userId));
      return row?.last ?? null;
    },

    async touchOpenReview(userId) {
      await db.update(importItem).set({ updatedAt: new Date() }).where(openItemsOf(userId));
    },
  };
}

import { and, asc, eq, inArray } from "drizzle-orm";

import type { Copy } from "@/model/copy/copy";
import type { NewCopy } from "@/model/copy/new-copy";
import type { AddGameResult, NewLibraryEntry, OwnedGameMark } from "@/model/game/add-game";
import type { CatalogGameData, IgdbGameData } from "@/model/game/catalog";
import { GameAlreadyInLibraryError, GameNotFoundError } from "@/model/game/errors";
import type { GameCorrections, LibraryGame } from "@/model/game/library-game";
import type { GameRemovalPlan } from "@/model/game/removal";
import type { StatusChangePlan } from "@/model/status/status";
import type { Database } from "@/persistence/db";
import { toCopy, toNewCopyRow } from "@/persistence/mapper/copy/copy-mapper";
import {
  toCatalogUpdate,
  toIgdbCatalogRow,
  toLibraryGame,
  toManualCatalogRow,
} from "@/persistence/mapper/game/game-mapper";
import { toStatus } from "@/persistence/mapper/status/status-mapper";
import { copy } from "@/persistence/sql/copy/copy";
import { catalogGame } from "@/persistence/sql/game/catalog-game";
import { libraryGame } from "@/persistence/sql/game/library-game";
import { status } from "@/persistence/sql/status/status";
import { store } from "@/persistence/sql/store/store";

import { writeStatusChange } from "./status-change-writer";

export type GameRepository = Readonly<{
  listLibrary(userId: string): Promise<readonly LibraryGame[]>;
  findById(userId: string, gameId: string): Promise<LibraryGame | null>;
  findOwnedMarks(userId: string, igdbIds: readonly number[]): Promise<readonly OwnedGameMark[]>;
  addIgdbGame(userId: string, data: IgdbGameData, entry: NewLibraryEntry): Promise<AddGameResult>;
  addManualGame(userId: string, data: CatalogGameData, entry: NewLibraryEntry): Promise<string>;
  applyStatusChange(userId: string, gameId: string, plan: StatusChangePlan): Promise<void>;
  updateCorrections(userId: string, gameId: string, corrections: GameCorrections): Promise<void>;
  updateScore(userId: string, gameId: string, score: number | null): Promise<void>;
  setNotInterested(userId: string, gameIds: readonly string[], notInterested: boolean): Promise<void>;
  linkToIgdb(userId: string, game: Pick<LibraryGame, "id" | "catalogGameId">, data: IgdbGameData): Promise<void>;
  updateCatalogFromIgdb(catalogGameId: string, data: IgdbGameData): Promise<void>;
  removeFromLibrary(userId: string, plan: GameRemovalPlan): Promise<void>;
}>;

function selectGames(db: Database) {
  return db
    .select({ library: libraryGame, catalog: catalogGame, status })
    .from(libraryGame)
    .innerJoin(catalogGame, eq(libraryGame.catalogGameId, catalogGame.id))
    .innerJoin(status, eq(libraryGame.statusId, status.id));
}

function selectCopies(db: Database) {
  return db
    .select({ copy, storeName: store.name })
    .from(copy)
    .innerJoin(store, eq(copy.storeId, store.id))
    .orderBy(asc(copy.createdAt));
}

function groupCopiesByGame(rows: Awaited<ReturnType<typeof listCopyRows>>): ReadonlyMap<string, Copy[]> {
  const byGame = new Map<string, Copy[]>();

  for (const row of rows) {
    const copies = byGame.get(row.copy.libraryGameId) ?? [];
    copies.push(toCopy(row.copy, row.storeName));
    byGame.set(row.copy.libraryGameId, copies);
  }

  return byGame;
}

function listCopyRows(db: Database, userId: string) {
  return selectCopies(db).where(eq(copy.userId, userId));
}

async function upsertIgdbCatalog(tx: Database, data: IgdbGameData): Promise<string> {
  await tx.insert(catalogGame).values(toIgdbCatalogRow(data)).onConflictDoNothing({ target: catalogGame.igdbId });

  const [row] = await tx
    .select({ id: catalogGame.id })
    .from(catalogGame)
    .where(eq(catalogGame.igdbId, data.igdbId))
    .limit(1);

  return row.id;
}

async function insertLibraryEntry(
  tx: Database,
  userId: string,
  catalogGameId: string,
  entry: NewLibraryEntry,
): Promise<string | null> {
  const [row] = await tx
    .insert(libraryGame)
    .values({ userId, catalogGameId, statusId: entry.statusId, statusSince: entry.statusSince })
    .onConflictDoNothing({ target: [libraryGame.userId, libraryGame.catalogGameId] })
    .returning({ id: libraryGame.id });

  return row?.id ?? null;
}

async function findGameIdByCatalog(tx: Database, userId: string, catalogGameId: string): Promise<string | null> {
  const [row] = await tx
    .select({ id: libraryGame.id })
    .from(libraryGame)
    .where(and(eq(libraryGame.userId, userId), eq(libraryGame.catalogGameId, catalogGameId)))
    .limit(1);

  return row?.id ?? null;
}

async function insertCopyIfAny(tx: Database, userId: string, gameId: string, value: NewCopy | null): Promise<void> {
  if (value) {
    await tx.insert(copy).values(toNewCopyRow(userId, gameId, value));
  }
}

async function updateOwnGame(
  db: Database,
  userId: string,
  gameId: string,
  values: Partial<typeof libraryGame.$inferInsert>,
): Promise<void> {
  const updated = await db
    .update(libraryGame)
    .set(values)
    .where(and(eq(libraryGame.id, gameId), eq(libraryGame.userId, userId)))
    .returning({ id: libraryGame.id });

  if (updated.length === 0) {
    throw new GameNotFoundError();
  }
}

async function repointToIgdbRow(
  tx: Database,
  userId: string,
  game: Pick<LibraryGame, "id" | "catalogGameId">,
  data: IgdbGameData,
): Promise<void> {
  const targetId = await upsertIgdbCatalog(tx, data);

  if ((await findGameIdByCatalog(tx, userId, targetId)) !== null) {
    throw new GameAlreadyInLibraryError();
  }

  await updateOwnGame(tx, userId, game.id, { catalogGameId: targetId });
  await tx.delete(catalogGame).where(and(eq(catalogGame.id, game.catalogGameId), eq(catalogGame.ownerId, userId)));
}

export function createGameRepository(db: Database): GameRepository {
  return {
    async listLibrary(userId) {
      const [games, copies] = await Promise.all([
        selectGames(db).where(eq(libraryGame.userId, userId)),
        listCopyRows(db, userId),
      ]);
      const copiesByGame = groupCopiesByGame(copies);

      return games.map((row) => toLibraryGame(row, toStatus(row.status), copiesByGame.get(row.library.id) ?? []));
    },

    async findById(userId, gameId) {
      const [row] = await selectGames(db)
        .where(and(eq(libraryGame.id, gameId), eq(libraryGame.userId, userId)))
        .limit(1);

      if (!row) {
        return null;
      }

      const copies = await selectCopies(db).where(and(eq(copy.libraryGameId, gameId), eq(copy.userId, userId)));
      return toLibraryGame(row, toStatus(row.status), groupCopiesByGame(copies).get(gameId) ?? []);
    },

    async findOwnedMarks(userId, igdbIds) {
      if (igdbIds.length === 0) {
        return [];
      }

      const rows = await db
        .select({ igdbId: catalogGame.igdbId, gameId: libraryGame.id, statusSystemKey: status.systemKey })
        .from(libraryGame)
        .innerJoin(catalogGame, eq(libraryGame.catalogGameId, catalogGame.id))
        .innerJoin(status, eq(libraryGame.statusId, status.id))
        .where(and(eq(libraryGame.userId, userId), inArray(catalogGame.igdbId, [...igdbIds])));

      return rows.flatMap(({ igdbId, gameId, statusSystemKey }) =>
        igdbId === null ? [] : [{ igdbId, gameId, statusSystemKey }],
      );
    },

    addIgdbGame(userId, data, entry) {
      return db.transaction(async (tx): Promise<AddGameResult> => {
        const catalogGameId = await upsertIgdbCatalog(tx, data);
        const gameId = await insertLibraryEntry(tx, userId, catalogGameId, entry);

        if (gameId === null) {
          return { kind: "already_in_library", gameId: (await findGameIdByCatalog(tx, userId, catalogGameId)) ?? "" };
        }

        await insertCopyIfAny(tx, userId, gameId, entry.copy);
        return { kind: "added", gameId };
      });
    },

    addManualGame(userId, data, entry) {
      return db.transaction(async (tx) => {
        const [catalogRow] = await tx
          .insert(catalogGame)
          .values(toManualCatalogRow(userId, data))
          .returning({ id: catalogGame.id });
        // Una fila recién creada no puede chocar con la restricción de un juego por usuario.
        const gameId = (await insertLibraryEntry(tx, userId, catalogRow.id, entry)) ?? "";

        await insertCopyIfAny(tx, userId, gameId, entry.copy);
        return gameId;
      });
    },

    applyStatusChange(userId, gameId, plan) {
      return db.transaction((tx) => writeStatusChange(tx, userId, gameId, plan));
    },

    updateCorrections(userId, gameId, corrections) {
      return updateOwnGame(db, userId, gameId, corrections);
    },

    updateScore(userId, gameId, score) {
      return updateOwnGame(db, userId, gameId, { score });
    },

    async setNotInterested(userId, gameIds, notInterested) {
      await db
        .update(libraryGame)
        .set({ notInterested })
        .where(and(eq(libraryGame.userId, userId), inArray(libraryGame.id, [...gameIds])));
    },

    linkToIgdb(userId, game, data) {
      return db.transaction((tx) => repointToIgdbRow(tx, userId, game, data));
    },

    async updateCatalogFromIgdb(catalogGameId, data) {
      await db
        .update(catalogGame)
        .set(toCatalogUpdate(data))
        .where(and(eq(catalogGame.id, catalogGameId), eq(catalogGame.source, "igdb")));
    },

    removeFromLibrary(userId, plan) {
      return db.transaction(async (tx) => {
        const removed = await tx
          .delete(libraryGame)
          .where(and(eq(libraryGame.id, plan.libraryGameId), eq(libraryGame.userId, userId)))
          .returning({ id: libraryGame.id });

        if (removed.length === 0) {
          throw new GameNotFoundError();
        }

        if (plan.catalogGameIdToDelete !== null) {
          await tx
            .delete(catalogGame)
            .where(and(eq(catalogGame.id, plan.catalogGameIdToDelete), eq(catalogGame.ownerId, userId)));
        }
      });
    },
  };
}

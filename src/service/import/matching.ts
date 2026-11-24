import type { IgdbSearchResult } from "@/model/game/catalog";
import type { ImportItem, ItemMatch, LibraryTitle, MatchedGame, OpenReview } from "@/model/import/import-entry";
import {
  type ExternalId,
  type ExternalStoreKey,
  editionRetryOf,
  externalIdOf,
  findBaseItem,
  isNonGameItem,
  MATCHING_BATCH_SIZE,
  MAX_EDITION_SEARCHES,
  MAX_TITLE_SEARCHES,
  resolveNonGame,
  titlesOf,
} from "@/model/import/matching";
import { joinSameName } from "@/model/import/same-name";
import { matchByTitle, matchWithoutEdition, type TitleMatch } from "@/model/import/title-match";

export type MatchingIgdb = Readonly<{
  findByExternalIds(store: ExternalStoreKey, uids: readonly string[]): Promise<ReadonlyMap<string, number>>;
  searchMany(titles: readonly string[]): Promise<ReadonlyMap<string, readonly IgdbSearchResult[]>>;
  getGamesData(igdbIds: readonly number[]): Promise<ReadonlyMap<number, MatchedGame>>;
}>;

export type MatchingRepo = Readonly<{
  listPendingItems(userId: string, limit: number): Promise<readonly ImportItem[]>;
  listOpenItems(userId: string): Promise<readonly ImportItem[]>;
  listLibraryTitles(userId: string): Promise<readonly LibraryTitle[]>;
  listOpenReview(userId: string): Promise<OpenReview>;
  saveMatches(userId: string, matches: readonly ItemMatch[]): Promise<void>;
}>;

/** Lo que va a IGDB por cada fila: un juego por su ID en la tienda o por título, o la búsqueda. */
type Lookup = Readonly<{ item: ImportItem; igdbId: number | null; title: TitleMatch | null }>;

async function idLookups(igdb: MatchingIgdb, items: readonly ImportItem[]): Promise<ReadonlyMap<string, number>> {
  const byStore = new Map<ExternalStoreKey, ExternalId[]>();

  for (const id of items.flatMap((item) => externalIdOf(item) ?? [])) {
    byStore.set(id.store, [...(byStore.get(id.store) ?? []), id]);
  }

  const found = new Map<string, number>();

  for (const [store, ids] of byStore) {
    const games = await igdb.findByExternalIds(store, ids.map((id) => id.uid));
    games.forEach((igdbId, uid) => found.set(`${store}:${uid}`, igdbId));
  }

  return found;
}

function igdbIdOf(item: ImportItem, byExternal: ReadonlyMap<string, number>): number | null {
  const id = externalIdOf(item);
  return id ? (byExternal.get(`${id.store}:${id.uid}`) ?? null) : null;
}

/** Primero por ID en la tienda; el resto, por título, hasta `MAX_TITLE_SEARCHES` (design.md §7). */
async function lookUp(igdb: MatchingIgdb, games: readonly ImportItem[]): Promise<readonly Lookup[]> {
  const byExternal = await idLookups(igdb, games);
  const byId = games.flatMap((item) => {
    const igdbId = igdbIdOf(item, byExternal);
    return igdbId === null ? [] : [{ item, igdbId, title: null }];
  });
  const forTitle = games.filter((item) => igdbIdOf(item, byExternal) === null).slice(0, MAX_TITLE_SEARCHES);
  const results = forTitle.length > 0 ? await igdb.searchMany(forTitle.map((item) => item.title)) : new Map();

  const byTitle = forTitle.map((item) => ({
    item,
    igdbId: null,
    title: matchByTitle({ titles: titlesOf(item), year: item.year }, results.get(item.title) ?? []),
  }));

  return [...byId, ...(await retryWithoutEdition(igdb, byTitle))];
}

/**
 * Lo que quedaría en «No lo encontré» y nombra una edición se busca sin ella, hasta `MAX_EDITION_SEARCHES`;
 * los demás no se guardan y siguen pendientes para la tanda siguiente (design.md §7).
 */
async function retryWithoutEdition(igdb: MatchingIgdb, lookups: readonly Lookup[]): Promise<readonly Lookup[]> {
  const retries = lookups.flatMap((lookup) => {
    const stripped = lookup.title ? editionRetryOf(lookup.item, lookup.title) : null;
    return stripped === null ? [] : [{ lookup, stripped }];
  });

  if (retries.length === 0) {
    return lookups;
  }

  const now = retries.slice(0, MAX_EDITION_SEARCHES);
  const later = new Set(retries.slice(MAX_EDITION_SEARCHES).map(({ lookup }) => lookup));
  const results = await igdb.searchMany(now.map(({ stripped }) => stripped));
  const retried = new Map(
    now.map(({ lookup, stripped }) => [
      lookup,
      { ...lookup, title: matchWithoutEdition({ titles: [stripped], year: lookup.item.year }, results.get(stripped) ?? []) },
    ]),
  );

  return lookups.filter((lookup) => !later.has(lookup)).map((lookup) => retried.get(lookup) ?? lookup);
}

function toMatch(lookup: Lookup, games: ReadonlyMap<number, MatchedGame>): ItemMatch {
  const { item } = lookup;
  const byId = lookup.igdbId === null ? undefined : games.get(lookup.igdbId);

  if (byId) {
    return { itemId: item.id, kind: "matched", game: byId };
  }

  const match: TitleMatch = lookup.title ?? { kind: "not_found" };

  if (match.kind === "matched") {
    const game = games.get(match.result.igdbId);
    return game ? { itemId: item.id, kind: "matched", game } : { itemId: item.id, kind: "not_found" };
  }

  return match.kind === "candidates"
    ? { itemId: item.id, kind: "candidates", candidates: match.candidates }
    : { itemId: item.id, kind: "not_found" };
}

function chosenIgdbIds(lookups: readonly Lookup[]): readonly number[] {
  return lookups.flatMap(({ igdbId, title }) => {
    if (igdbId !== null) {
      return [igdbId];
    }

    return title?.kind === "matched" ? [title.result.igdbId] : [];
  });
}

/** Las entradas que no son juegos traen a su base a la tanda, si todavía no cruzó. */
function withPendingBases(pending: readonly ImportItem[], open: readonly ImportItem[]): readonly ImportItem[] {
  const games = pending.filter((item) => !isNonGameItem(item));
  const ids = new Set(games.map((item) => item.id));
  const bases = pending
    .filter(isNonGameItem)
    .flatMap((item) => findBaseItem(item, open) ?? [])
    .filter((base) => base.matchState === "pending" && !ids.has(base.id));

  return [...games, ...new Map(bases.map((base) => [base.id, base])).values()];
}

export type MatchingStep = Readonly<{ advance(userId: string): Promise<void> }>;

/**
 * Una tanda del cruce. Todo lo que pide a IGDB va antes de guardar nada: si IGDB falla, la tanda no queda
 * a medias y la próxima llamada la repite.
 */
export function createMatchingStep({ importRepo, igdb }: Readonly<{ importRepo: MatchingRepo; igdb: MatchingIgdb }>): MatchingStep {
  return {
    async advance(userId) {
      const pending = await importRepo.listPendingItems(userId, MATCHING_BATCH_SIZE);

      if (pending.length === 0) {
        return;
      }

      const [open, library, review] = await Promise.all([
        importRepo.listOpenItems(userId),
        importRepo.listLibraryTitles(userId),
        importRepo.listOpenReview(userId),
      ]);
      const lookups = await lookUp(igdb, withPendingBases(pending, open));
      const games = await igdb.getGamesData(chosenIgdbIds(lookups));
      const matches = lookups.map((lookup) => toMatch(lookup, games));
      const resolved = new Set(matches.map((match) => match.itemId));
      const nonGames = pending.filter(isNonGameItem).flatMap((item) => {
        const base = findBaseItem(item, open);
        const match = resolveNonGame(item, base, base !== undefined && (base.matchState !== "pending" || resolved.has(base.id)), library);
        return match ? [match] : [];
      });

      // El mismo nombre desde varias fuentes es una sola pregunta (design.md §10).
      const joined = joinSameName(matches, [...pending, ...open], review.entries);
      await importRepo.saveMatches(userId, [...joined, ...nonGames]);
    },
  };
}

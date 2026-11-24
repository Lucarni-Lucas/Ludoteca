import type { ImportItem, ItemMatch, LibraryTitle } from "@/model/import/import-entry";
import { detectNonGame, findNonGameBase } from "@/model/import/non-game";
import { GOG_SLUG, STEAM_SLUG } from "@/model/store/store";

/** Filas por llamada: cada una entra holgada en los 20 s de una función (design.md §7). */
export const MATCHING_BATCH_SIZE = 60;
/** Búsquedas por título de a una en una tanda; las que no entran esperan a la siguiente. */
export const MAX_TITLE_SEARCHES = 30;

export type ExternalStoreKey = "steam" | "gog";

export type ExternalId = Readonly<{ store: ExternalStoreKey; uid: string }>;

/** IGDB conoce los IDs de Steam y de GOG; el de Epic de Playnite no es el que guarda (design.md §7). */
export function externalIdOf(item: ImportItem): ExternalId | null {
  if (item.source === "ign") {
    return item.steamAppId ? { store: "steam", uid: item.steamAppId } : null;
  }

  if (!item.storeGameId || !item.store) {
    return null;
  }

  if (item.store.slug === STEAM_SLUG) {
    return { store: "steam", uid: item.storeGameId };
  }

  return item.store.slug === GOG_SLUG ? { store: "gog", uid: item.storeGameId } : null;
}

/** El título y los alternativos de IGN: cualquiera cuenta para cruzar. */
export function titlesOf(item: ImportItem): readonly string[] {
  return [item.title, ...item.altTitles];
}

export function isNonGameItem(item: ImportItem): boolean {
  return detectNonGame(item.title) !== null;
}

function asBaseCandidate(item: ImportItem) {
  return { title: item.title, storeId: item.store?.id ?? null };
}

/** El juego base de una entrada que no es juego entre las filas abiertas de su tienda. */
export function findBaseItem(item: ImportItem, openItems: readonly ImportItem[]): ImportItem | undefined {
  const candidates = openItems
    .filter((other) => other.id !== item.id)
    .map((other) => ({ ...asBaseCandidate(other), item: other }));
  return findNonGameBase(asBaseCandidate(item), candidates)?.item;
}

function hasLibraryBase(item: ImportItem, library: readonly LibraryTitle[]): boolean {
  const candidates = library.flatMap((game) => game.storeIds.map((storeId) => ({ title: game.title, storeId })));
  return findNonGameBase(asBaseCandidate(item), candidates) !== undefined;
}

/**
 * Qué pasa con una entrada que no es juego: se cuelga de su base o va a «No lo encontré». `null` si su
 * base todavía no cruzó: espera a la tanda siguiente, para colgarse de un juego que ya tiene su revisión.
 */
export function resolveNonGame(
  item: ImportItem,
  base: ImportItem | undefined,
  baseResolved: boolean,
  library: readonly LibraryTitle[],
): ItemMatch | null {
  if (base) {
    return baseResolved ? { itemId: item.id, kind: "absorbed", baseItemId: base.id } : null;
  }

  return hasLibraryBase(item, library)
    ? { itemId: item.id, kind: "absorbed", baseItemId: null }
    : { itemId: item.id, kind: "not_found" };
}

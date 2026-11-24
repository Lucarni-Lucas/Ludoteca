import type { CopyKind } from "@/model/copy/copy";
import type { ImportItem, LibraryMatch } from "@/model/import/import-entry";
import { titleKey } from "@/model/import/title-match";
import { EPIC_GAMES_SLUG, STEAM_SLUG, type Store } from "@/model/store/store";

/**
 * Una copia que la importación sumaría: una por tienda y por juego, aunque lleguen varias filas de esa
 * tienda (Steam por la cuenta y por Playnite, una edición, un soundtrack colgado).
 */
export type SuggestedCopy = Readonly<{
  store: Store;
  /** El tipo elegido o, si no hay, el sugerido. */
  kind: CopyKind;
  /** El usuario eligió el tipo (o no importarla): es una decisión. */
  chosen: boolean;
  excluded: boolean;
  /** Steam desde Playnite que la cuenta no tiene: puede ser de la familia. */
  familySuggested: boolean;
  /** Steam desde Playnite con la cuenta sin conectar: no se sabe si es tuya. */
  awaitingSteam: boolean;
  storeGameId: string | null;
  playtimeMinutes: number | null;
  itemIds: readonly string[];
}>;

export type CopyContext = Readonly<{
  steamConnected: boolean;
  /** El título del juego en el catálogo, para elegir la fila del juego base sobre la de una edición. */
  catalogTitle: string | null;
  library: LibraryMatch | undefined;
}>;

function groupByStore(items: readonly ImportItem[]): ReadonlyMap<string, readonly ImportItem[]> {
  const byStore = new Map<string, ImportItem[]>();

  for (const item of items) {
    if (item.store) {
      byStore.set(item.store.id, [...(byStore.get(item.store.id) ?? []), item]);
    }
  }

  return byStore;
}

/** La fila que le da su ID en la tienda a la copia: la de la cuenta de Steam, después la del juego base. */
function primaryItem(items: readonly ImportItem[], catalogTitle: string | null): ImportItem {
  const own = items.filter((item) => item.matchState !== "absorbed");
  const candidates = own.length > 0 ? own : items;
  const baseKey = catalogTitle === null ? null : titleKey(catalogTitle);

  return (
    candidates.find((item) => item.source === "steam") ??
    candidates.find((item) => titleKey(item.title) === baseKey) ??
    candidates[0]
  );
}

/** En Steam manda la cuenta; en el resto, la suma de las filas. Vacío si ninguna informa horas. */
function playtimeOf(items: readonly ImportItem[]): number | null {
  const account = items.find((item) => item.source === "steam");

  if (account) {
    return account.playtimeMinutes;
  }

  const known = items.flatMap((item) => (item.playtimeMinutes === null ? [] : [item.playtimeMinutes]));
  return known.length === 0 ? null : known.reduce((total, minutes) => total + minutes, 0);
}

type KindSuggestion = Readonly<{ kind: CopyKind; familySuggested: boolean; awaitingSteam: boolean }>;

function suggestKind(store: Store, items: readonly ImportItem[], steamConnected: boolean): KindSuggestion {
  if (store.slug === STEAM_SLUG && !items.some((item) => item.source === "steam")) {
    return steamConnected
      ? { kind: "family", familySuggested: true, awaitingSteam: false }
      : { kind: "family", familySuggested: false, awaitingSteam: true };
  }

  return { kind: store.slug === EPIC_GAMES_SLUG ? "free" : "purchased", familySuggested: false, awaitingSteam: false };
}

/** Una tienda en la que el juego ya tiene copia no recibe otra, aunque esa copia se haya cargado a mano. */
function alreadyOwned(library: LibraryMatch | undefined, storeId: string): boolean {
  return library?.copies.some((owned) => owned.storeId === storeId) ?? false;
}

function suggestCopy(store: Store, items: readonly ImportItem[], context: CopyContext): SuggestedCopy {
  const chosenKind = items.find((item) => item.copyKind !== null)?.copyKind ?? null;
  const excluded = items.every((item) => item.excluded);
  const suggestion = suggestKind(store, items, context.steamConnected);

  return {
    store,
    kind: chosenKind ?? suggestion.kind,
    chosen: chosenKind !== null || excluded,
    excluded,
    familySuggested: suggestion.familySuggested,
    awaitingSteam: suggestion.awaitingSteam,
    storeGameId: primaryItem(items, context.catalogTitle).storeGameId,
    playtimeMinutes: playtimeOf(items),
    itemIds: items.map((item) => item.id),
  };
}

export function suggestCopies(items: readonly ImportItem[], context: CopyContext): readonly SuggestedCopy[] {
  return [...groupByStore(items)].flatMap(([storeId, storeItems]) => {
    const store = storeItems[0].store;
    return store === null || alreadyOwned(context.library, storeId) ? [] : [suggestCopy(store, storeItems, context)];
  });
}

/** Las copias que entrarían: sin las excluidas. */
export function keptCopies(copies: readonly SuggestedCopy[]): readonly SuggestedCopy[] {
  return copies.filter((copy) => !copy.excluded);
}

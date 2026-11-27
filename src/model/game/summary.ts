import { COPY_KINDS, isLost } from "@/model/copy/copy";
import { type CopyKindFilter, GAME_MARKS, type GameMark, type HiddenFilter, LOST_KIND, marksOf, visibleGames } from "@/model/game/filters";
import type { LibraryGame } from "@/model/game/library-game";
import { isWishlist } from "@/model/status/status";
import type { StatusGroup } from "@/model/status/status-group";

type Tally = Readonly<Record<string, number>>;

export type LibrarySummary = Readonly<{
  games: number;
  stores: number;
  wishlist: number;
  lost: number;
}>;

export type LibraryCounts = Readonly<{
  total: number;
  statuses: Tally;
  groups: Readonly<Partial<Record<StatusGroup, number>>>;
  stores: Tally;
  kinds: Readonly<Record<CopyKindFilter, number>>;
  marks: Readonly<Record<GameMark, number>>;
}>;

export type StoreOption = Readonly<{ id: string; name: string }>;

function currentCopies(game: LibraryGame) {
  return game.copies.filter((copy) => !isLost(copy));
}

/** Nunca cuenta los ocultos: aunque se muestren, no son parte de la biblioteca. */
export function summarizeLibrary(games: readonly LibraryGame[]): LibrarySummary {
  const interesting = visibleGames(games, "exclude");
  const owned = interesting.filter((game) => currentCopies(game).length > 0);

  return {
    games: owned.length,
    stores: new Set(owned.flatMap((game) => currentCopies(game).map((copy) => copy.storeId))).size,
    wishlist: interesting.filter((game) => isWishlist(game.status)).length,
    lost: interesting.filter((game) => game.copies.length > 0 && currentCopies(game).length === 0).length,
  };
}

function tally(keys: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const key of keys) {
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

function countGamesWith(games: readonly LibraryGame[], keysOf: (game: LibraryGame) => readonly string[]) {
  return tally(games.flatMap((game) => [...new Set(keysOf(game))]));
}

function kindKeys(game: LibraryGame): readonly string[] {
  return game.copies.map((copy) => (isLost(copy) ? LOST_KIND : copy.kind));
}

function withEveryKind(counts: Tally): Readonly<Record<CopyKindFilter, number>> {
  const kinds = [...COPY_KINDS, LOST_KIND] as const;
  return Object.fromEntries(kinds.map((kind) => [kind, counts[kind] ?? 0])) as Record<CopyKindFilter, number>;
}

function withEveryMark(counts: Tally): Readonly<Record<GameMark, number>> {
  return Object.fromEntries(GAME_MARKS.map((mark) => [mark, counts[mark] ?? 0])) as Record<GameMark, number>;
}

/** Las cantidades son sobre toda la biblioteca visible, no sobre el resultado de los otros filtros. */
export function countLibraryOptions(games: readonly LibraryGame[], hidden: HiddenFilter): LibraryCounts {
  const visible = visibleGames(games, hidden);

  return {
    total: visible.length,
    statuses: tally(visible.map((game) => game.status.id)),
    groups: tally(visible.map((game) => game.status.group)),
    stores: countGamesWith(visible, (game) => game.copies.map((copy) => copy.storeId)),
    kinds: withEveryKind(countGamesWith(visible, kindKeys)),
    marks: withEveryMark(countGamesWith(visible, marksOf)),
  };
}

export function listStoreOptions(games: readonly LibraryGame[]): readonly StoreOption[] {
  const stores = new Map(games.flatMap((game) => game.copies.map((copy) => [copy.storeId, copy.storeName] as const)));

  return [...stores]
    .map(([id, name]) => ({ id, name }))
    .toSorted((a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1));
}

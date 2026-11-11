import { type CopyKind, isLost } from "@/model/copy/copy";
import { effectiveHours, type LibraryGame, playedHours } from "@/model/game/library-game";
import { normalizeText } from "@/model/game/normalize-text";
import type { StatusGroup } from "@/model/status/status-group";

export const LOST_KIND = "lost";

export type CopyKindFilter = CopyKind | typeof LOST_KIND;

export type NumberRange = Readonly<{ min: number | null; max: number | null }>;

export const NO_RANGE: NumberRange = { min: null, max: null };

export type LibraryFilters = Readonly<{
  statusIds: readonly string[];
  groups: readonly StatusGroup[];
  storeIds: readonly string[];
  kinds: readonly CopyKindFilter[];
  duration: NumberRange;
  played: NumberRange;
  score: NumberRange;
  title: string;
  showNotInterested: boolean;
}>;

export const NO_FILTERS: LibraryFilters = {
  statusIds: [],
  groups: [],
  storeIds: [],
  kinds: [],
  duration: NO_RANGE,
  played: NO_RANGE,
  score: NO_RANGE,
  title: "",
  showNotInterested: false,
};

export type RangePreset = Readonly<{ label: string; range: NumberRange }>;

export const DURATION_PRESETS: readonly RangePreset[] = [
  { label: "< 5 h", range: { min: 0, max: 5 } },
  { label: "5–15 h", range: { min: 5, max: 15 } },
  { label: "15–40 h", range: { min: 15, max: 40 } },
  { label: "40 h +", range: { min: 40, max: null } },
];

export const PLAYED_PRESETS: readonly RangePreset[] = [
  { label: "Sin abrir", range: { min: 0, max: 0 } },
  { label: "< 2 h", range: { min: 0, max: 2 } },
  { label: "2–20 h", range: { min: 2, max: 20 } },
  { label: "20 h +", range: { min: 20, max: null } },
];

export function toggleOption<T>(selected: readonly T[], option: T): readonly T[] {
  return selected.includes(option) ? selected.filter((value) => value !== option) : [...selected, option];
}

export function isSameRange(a: NumberRange, b: NumberRange): boolean {
  return a.min === b.min && a.max === b.max;
}

function isRangeActive(range: NumberRange): boolean {
  return range.min !== null || range.max !== null;
}

function isWithin(value: number, range: NumberRange): boolean {
  return (range.min === null || value >= range.min) && (range.max === null || value <= range.max);
}

/** Con el filtro activo, un juego sin el dato queda afuera: no se sabe si cumple. */
function matchesRange(value: number | null, range: NumberRange): boolean {
  return !isRangeActive(range) || (value !== null && isWithin(value, range));
}

function matchesStatus(game: LibraryGame, filters: LibraryFilters): boolean {
  const noneSelected = filters.statusIds.length === 0 && filters.groups.length === 0;
  return noneSelected || filters.statusIds.includes(game.status.id) || filters.groups.includes(game.status.group);
}

function matchesStore(game: LibraryGame, storeIds: readonly string[]): boolean {
  return storeIds.length === 0 || game.copies.some((copy) => storeIds.includes(copy.storeId));
}

/** Los tipos cuentan solo las copias vigentes, y «Ya no lo tengo» solo las perdidas. */
function copyMatchesKind(copy: LibraryGame["copies"][number], kind: CopyKindFilter): boolean {
  return kind === LOST_KIND ? isLost(copy) : !isLost(copy) && copy.kind === kind;
}

function matchesKind(game: LibraryGame, kinds: readonly CopyKindFilter[]): boolean {
  return kinds.length === 0 || game.copies.some((copy) => kinds.some((kind) => copyMatchesKind(copy, kind)));
}

function matchesTitle(game: LibraryGame, title: string): boolean {
  return normalizeText(game.title).includes(normalizeText(title));
}

function playedValue(game: LibraryGame): number | null {
  return game.copies.length === 0 ? null : playedHours(game);
}

export function visibleGames(games: readonly LibraryGame[], showNotInterested: boolean): readonly LibraryGame[] {
  return showNotInterested ? games : games.filter((game) => !game.notInterested);
}

/** Cada filtro se evalúa por separado: Civilization VI (Epic gratis, Steam comprado) aparece con Steam + Gratis. */
export function filterLibrary(games: readonly LibraryGame[], filters: LibraryFilters): readonly LibraryGame[] {
  return visibleGames(games, filters.showNotInterested).filter(
    (game) =>
      matchesStatus(game, filters) &&
      matchesStore(game, filters.storeIds) &&
      matchesKind(game, filters.kinds) &&
      matchesRange(effectiveHours(game), filters.duration) &&
      matchesRange(playedValue(game), filters.played) &&
      matchesRange(game.score, filters.score) &&
      matchesTitle(game, filters.title),
  );
}

export function hasActiveFilters(filters: LibraryFilters): boolean {
  return (
    filters.statusIds.length > 0 ||
    filters.groups.length > 0 ||
    filters.storeIds.length > 0 ||
    filters.kinds.length > 0 ||
    isRangeActive(filters.duration) ||
    isRangeActive(filters.played) ||
    isRangeActive(filters.score) ||
    filters.title.trim() !== ""
  );
}

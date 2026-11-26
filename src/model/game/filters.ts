import { type CopyKind, isLost } from "@/model/copy/copy";
import { effectiveHours, hasPlayedHours, type LibraryGame, playedHours } from "@/model/game/library-game";
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
  showHidden: boolean;
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
  showHidden: false,
};

export const DURATION_PRESET_IDS = ["under5", "from5to15", "from15to40", "over40"] as const;
export const PLAYED_PRESET_IDS = ["unopened", "under2", "from2to20", "over20"] as const;

/** El texto de cada rango rápido sale del catálogo, por su `id`. */
export type RangePresetId = (typeof DURATION_PRESET_IDS)[number] | (typeof PLAYED_PRESET_IDS)[number];

export type RangePreset = Readonly<{ id: RangePresetId; range: NumberRange }>;

export const DURATION_PRESETS: readonly RangePreset[] = [
  { id: "under5", range: { min: 0, max: 5 } },
  { id: "from5to15", range: { min: 5, max: 15 } },
  { id: "from15to40", range: { min: 15, max: 40 } },
  { id: "over40", range: { min: 40, max: null } },
];

export const PLAYED_PRESETS: readonly RangePreset[] = [
  { id: "unopened", range: { min: 0, max: 0 } },
  { id: "under2", range: { min: 0, max: 2 } },
  { id: "from2to20", range: { min: 2, max: 20 } },
  { id: "over20", range: { min: 20, max: null } },
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
  return hasPlayedHours(game) ? playedHours(game) : null;
}

export function visibleGames(games: readonly LibraryGame[], showHidden: boolean): readonly LibraryGame[] {
  return showHidden ? games : games.filter((game) => !game.hidden);
}

/** Cada filtro se evalúa por separado: Civilization VI (Epic gratis, Steam comprado) aparece con Steam + Gratis. */
export function filterLibrary(games: readonly LibraryGame[], filters: LibraryFilters): readonly LibraryGame[] {
  return visibleGames(games, filters.showHidden).filter(
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

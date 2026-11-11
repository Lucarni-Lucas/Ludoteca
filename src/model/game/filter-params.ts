import {
  type CopyKindFilter,
  type LibraryFilters,
  LOST_KIND,
  NO_FILTERS,
  NO_RANGE,
  type NumberRange,
} from "@/model/game/filters";
import { DEFAULT_SORT, LIBRARY_SORTS, type LibrarySort } from "@/model/game/sort";
import { COPY_KINDS } from "@/model/copy/copy";
import { STATUS_GROUPS, type StatusGroup } from "@/model/status/status-group";

export type LibraryView = Readonly<{
  filters: LibraryFilters;
  sort: LibrarySort;
}>;

export const DEFAULT_LIBRARY_VIEW: LibraryView = { filters: NO_FILTERS, sort: DEFAULT_SORT };

const LIST_SEPARATOR = ",";
const RANGE_SEPARATOR = "-";
const COPY_KIND_FILTERS: readonly CopyKindFilter[] = [...COPY_KINDS, LOST_KIND];

function readList(params: URLSearchParams, key: string): readonly string[] {
  return params.get(key)?.split(LIST_SEPARATOR).filter(Boolean) ?? [];
}

function readAllowed<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]): readonly T[] {
  return readList(params, key).filter((value): value is T => (allowed as readonly string[]).includes(value));
}

function parseBound(text: string | undefined): number | null {
  if (!text) {
    return null;
  }

  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function readRange(params: URLSearchParams, key: string): NumberRange {
  const text = params.get(key);

  if (!text?.includes(RANGE_SEPARATOR)) {
    return NO_RANGE;
  }

  const [min, max] = text.split(RANGE_SEPARATOR);
  return { min: parseBound(min), max: parseBound(max) };
}

function readSort(params: URLSearchParams): LibrarySort {
  const [sort] = readAllowed(params, "sort", LIBRARY_SORTS);
  return sort ?? DEFAULT_SORT;
}

/** Un parámetro inválido se ignora: la URL se puede editar a mano y nunca tiene que romper la pantalla. */
export function parseLibraryView(search: string): LibraryView {
  const params = new URLSearchParams(search);

  return {
    filters: {
      statusIds: readList(params, "status"),
      groups: readAllowed<StatusGroup>(params, "group", STATUS_GROUPS),
      storeIds: readList(params, "store"),
      kinds: readAllowed(params, "kind", COPY_KIND_FILTERS),
      duration: readRange(params, "dur"),
      played: readRange(params, "played"),
      score: readRange(params, "score"),
      title: params.get("q") ?? "",
      showNotInterested: params.get("hidden") === "1",
    },
    sort: readSort(params),
  };
}

function writeList(params: URLSearchParams, key: string, values: readonly string[]): void {
  if (values.length > 0) {
    params.set(key, values.join(LIST_SEPARATOR));
  }
}

function writeRange(params: URLSearchParams, key: string, { min, max }: NumberRange): void {
  if (min !== null || max !== null) {
    params.set(key, `${min ?? ""}${RANGE_SEPARATOR}${max ?? ""}`);
  }
}

export function serializeLibraryView({ filters, sort }: LibraryView): string {
  const params = new URLSearchParams();

  writeList(params, "status", filters.statusIds);
  writeList(params, "group", filters.groups);
  writeList(params, "store", filters.storeIds);
  writeList(params, "kind", filters.kinds);
  writeRange(params, "dur", filters.duration);
  writeRange(params, "played", filters.played);
  writeRange(params, "score", filters.score);

  if (filters.title !== "") {
    params.set("q", filters.title);
  }

  if (filters.showNotInterested) {
    params.set("hidden", "1");
  }

  if (sort !== DEFAULT_SORT) {
    params.set("sort", sort);
  }

  return params.toString();
}

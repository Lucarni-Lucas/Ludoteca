import { MAX_SCORE, MIN_SCORE, normalizeScore } from "@/model/game/score";
import type { IgnStatus } from "@/model/import/import-row";
import { BACKLOG_KEY, WISHLIST_KEY } from "@/model/status/status";

/** `status` usa los nombres de siempre; `flags` dice `completed` por Beat y `archived` por Quit (design.md §5). */
const STATUS_NAMES: ReadonlyMap<string, IgnStatus> = new Map([
  ["playing", "playing"],
  ["paused", "paused"],
  ["backlog", "backlog"],
  ["beat", "beat"],
  ["quit", "quit"],
  ["wishlist", "wishlist"],
]);

const FLAG_NAMES: ReadonlyMap<string, IgnStatus> = new Map([
  ["playing", "playing"],
  ["paused", "paused"],
  ["backlog", "backlog"],
  ["completed", "beat"],
  ["archived", "quit"],
  ["wishlist", "wishlist"],
]);

/** El `system_key` del estado de Ludoteca para cada uno de IGN, salvo Backlog, que depende de las copias. */
const STATUS_KEYS: Readonly<Record<Exclude<IgnStatus, "backlog">, string>> = {
  playing: "playing",
  paused: "paused",
  beat: "completed",
  quit: "abandoned",
  wishlist: WISHLIST_KEY,
};

export type IgnStatusRead = Readonly<{
  /** Sin repetir, y el de `status` primero: es el que va marcado si hay dos. */
  statuses: readonly IgnStatus[];
  /** Los valores que no se reconocieron, para que el adapter los avise. */
  unknown: readonly string[];
}>;

/** Los estados de un juego de IGN son la unión de su `status` y sus `flags`. */
export function readIgnStatuses(status: string | null, flags: readonly string[]): IgnStatusRead {
  const named = [
    ...(status === null ? [] : [{ value: status, status: STATUS_NAMES.get(status) }]),
    ...flags.map((flag) => ({ value: flag, status: FLAG_NAMES.get(flag) })),
  ];

  return {
    statuses: [...new Set(named.flatMap(({ status: known }) => (known ? [known] : [])))],
    unknown: named.filter(({ status: known }) => !known).map(({ value }) => value),
  };
}

export function statusKeyOfIgn(status: IgnStatus, hasCopy: boolean): string {
  if (status === "backlog") {
    return hasCopy ? BACKLOG_KEY : WISHLIST_KEY;
  }

  return STATUS_KEYS[status];
}

export type IgnStatusSuggestion =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "single"; statusKey: string }>
  /** Dos estados de IGN: el juego queda para revisar con los dos, el primero marcado. */
  | Readonly<{ kind: "conflict"; statusKeys: readonly string[] }>;

/** Backlog es Pendiente si queda alguna copia, y si no, Quiero jugarlo. */
export function suggestIgnStatus(statuses: readonly IgnStatus[], hasCopy: boolean): IgnStatusSuggestion {
  const keys = [...new Set(statuses.map((status) => statusKeyOfIgn(status, hasCopy)))];

  if (keys.length === 0) {
    return { kind: "none" };
  }

  return keys.length === 1 ? { kind: "single", statusKey: keys[0] } : { kind: "conflict", statusKeys: keys };
}

/** IGN da puntajes enteros: 8 pasa como 8.0. Uno fuera de rango no se adivina y queda sin puntaje. */
export function scoreFromIgn(score: number | null): number | null {
  if (score === null || Number.isNaN(score) || score < MIN_SCORE || score > MAX_SCORE) {
    return null;
  }

  return normalizeScore(score);
}

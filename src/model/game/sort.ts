import { effectiveHours, type LibraryGame, playedHours } from "@/model/game/library-game";
import { normalizeText } from "@/model/game/normalize-text";

export const LIBRARY_SORTS = ["recent", "score", "played", "duration", "title"] as const;

export type LibrarySort = (typeof LIBRARY_SORTS)[number];

export const DEFAULT_SORT: LibrarySort = "recent";

export const LIBRARY_SORT_LABELS: Readonly<Record<LibrarySort, string>> = {
  recent: "Agregados recientemente",
  score: "Mi puntaje",
  played: "Horas jugadas",
  duration: "Duración estimada",
  title: "Título (A–Z)",
};

type Comparator = (a: LibraryGame, b: LibraryGame) => number;

/** Los juegos sin el dato van al final, sin importar si el orden es ascendente o descendente. */
function byNumber(value: (game: LibraryGame) => number | null, direction: 1 | -1): Comparator {
  return (a, b) => {
    const left = value(a);
    const right = value(b);

    if (left === null || right === null) {
      return Number(left === null) - Number(right === null);
    }

    return (left - right) * direction;
  };
}

// Sin localeCompare: el orden tiene que dar igual en el servidor y en el navegador.
function compareText(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

const COMPARATORS: Readonly<Record<LibrarySort, Comparator>> = {
  recent: (a, b) => compareText(b.addedAt, a.addedAt),
  score: byNumber((game) => game.score, -1),
  played: byNumber((game) => (game.copies.length === 0 ? null : playedHours(game)), -1),
  duration: byNumber(effectiveHours, 1),
  title: (a, b) => compareText(normalizeText(a.title), normalizeText(b.title)),
};

export function sortLibrary(games: readonly LibraryGame[], sort: LibrarySort): readonly LibraryGame[] {
  return games.toSorted(COMPARATORS[sort]);
}

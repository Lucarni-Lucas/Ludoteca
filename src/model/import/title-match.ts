import type { ImportCandidate } from "@/model/import/import-entry";
import { MAX_CANDIDATES } from "@/model/import/import-entry";
import { normalizeText } from "@/model/game/normalize-text";

const NOT_ALPHANUMERIC = /[^\p{L}\p{N}]+/u;
// «KillingFloor2Beta» son cuatro palabras: el cambio a mayúscula y el paso entre letra y número las separan.
const CAMEL_BOUNDARY = /(?<=[\p{Ll}\p{N}])(?=\p{Lu})|(?<=\p{L})(?=\p{N})|(?<=\p{N})(?=\p{L})/gu;

/** Las palabras de un título, sin acentos ni mayúsculas. */
export function titleWords(title: string): readonly string[] {
  return normalizeText(title.replaceAll(CAMEL_BOUNDARY, " ")).split(NOT_ALPHANUMERIC).filter(Boolean);
}

/** «KillingFloor2» y «Killing Floor 2» dan la misma clave. */
export function titleKey(title: string): string {
  return titleWords(title).join("");
}

export type TitleMatchRow = Readonly<{
  /** El título y sus alternativos de IGN: cuenta cualquiera. */
  titles: readonly string[];
  year: number | null;
}>;

export type TitleMatch =
  | Readonly<{ kind: "matched"; result: ImportCandidate }>
  | Readonly<{ kind: "candidates"; candidates: readonly ImportCandidate[] }>
  | Readonly<{ kind: "not_found" }>;

/** Sin año de un lado, va al final: no hay forma de saber si está cerca. */
function yearDistance(rowYear: number | null, resultYear: number | null): number {
  if (rowYear === null || resultYear === null) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(rowYear - resultYear);
}

/** El de año más cercano primero; ante el mismo año, el orden de IGDB (`sort` es estable). */
function byClosestYear(rowYear: number | null, results: readonly ImportCandidate[]): readonly ImportCandidate[] {
  return [...results].sort((a, b) => yearDistance(rowYear, a.year) - yearDistance(rowYear, b.year));
}

/** Una edición y su juego base son el mismo juego: cuenta el primero que aparece. */
function uniqueByBase(results: readonly ImportCandidate[]): readonly ImportCandidate[] {
  const seen = new Set<number>();

  return results.filter((result) => {
    const isNew = !seen.has(result.baseIgdbId);
    seen.add(result.baseIgdbId);
    return isNew;
  });
}

function containsAll(words: readonly string[], other: readonly string[]): boolean {
  return other.length > 0 && other.every((word) => words.includes(word));
}

/** Alguno de los títulos tiene todas las palabras del resultado, o el resultado todas las de un título. */
function isSimilar(rowWords: readonly (readonly string[])[], result: ImportCandidate): boolean {
  const words = titleWords(result.title);
  return rowWords.some((row) => containsAll(row, words) || containsAll(words, row));
}

/** Los de la misma clave primero: el primer candidato es el más parecido. */
function candidatesOf(
  exact: readonly ImportCandidate[],
  similar: readonly ImportCandidate[],
): TitleMatch {
  const candidates = uniqueByBase([...exact, ...similar]).slice(0, MAX_CANDIDATES);
  return candidates.length === 0 ? { kind: "not_found" } : { kind: "candidates", candidates };
}

/**
 * Cruza sola una única clave idéntica, sea cual sea el año: el de Epic suele ser el de la tienda y no
 * el del juego (design.md §7). Con dos o más del mismo nombre, o ninguno igual, queda para elegir.
 */
export function matchByTitle(row: TitleMatchRow, results: readonly ImportCandidate[]): TitleMatch {
  const keys = new Set(row.titles.map(titleKey));
  const unique = uniqueByBase(results);
  const exact = unique.filter((result) => keys.has(titleKey(result.title)));
  const rowWords = row.titles.map(titleWords);
  const similar = unique.filter((result) => !exact.includes(result) && isSimilar(rowWords, result));

  if (exact.length === 1) {
    return { kind: "matched", result: exact[0] };
  }

  return candidatesOf(byClosestYear(row.year, exact), similar);
}

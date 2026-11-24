import { titleKey, titleWords } from "@/model/import/title-match";

/** Lo que va al final de un título y dice que no es el juego. Una nueva se suma acá (design.md §8). */
export const NON_GAME_SUFFIXES = [
  "Beta",
  "Tech Beta",
  "Public Test",
  "Public Testing",
  "Test Server",
  "Playtest",
  "Demo",
  "Soundtrack",
  "OST",
  "Dedicated Server",
  "Legacy Mode",
  "Services",
] as const;

// Primero las más largas: «Tech Beta» antes que «Beta».
const SUFFIX_WORDS = NON_GAME_SUFFIXES.map(titleWords).toSorted((a, b) => b.length - a.length);

// Epic oculta el nombre de algunos productos: «[REDACTED]».
const HIDDEN_NAME = /^\s*\[[^\s\]]+\]\s*$/u;

function endsWith(words: readonly string[], suffix: readonly string[]): boolean {
  return words.length > suffix.length && suffix.every((word, index) => words[words.length - suffix.length + index] === word);
}

export type NonGame =
  | Readonly<{ kind: "suffix"; baseKey: string }>
  | Readonly<{ kind: "hidden" }>;

/** `null` si el título es de un juego. El sufijo solo cuenta al final: «Demo» en el medio es parte del nombre. */
export function detectNonGame(title: string): NonGame | null {
  if (HIDDEN_NAME.test(title)) {
    return { kind: "hidden" };
  }

  const words = titleWords(title);
  const suffix = SUFFIX_WORDS.find((candidate) => endsWith(words, candidate));

  return suffix ? { kind: "suffix", baseKey: words.slice(0, words.length - suffix.length).join("") } : null;
}

export function isNonGame(title: string): boolean {
  return detectNonGame(title) !== null;
}

export type BaseCandidate = Readonly<{ title: string; storeId: string | null }>;

/**
 * El juego base de una entrada que no es juego, entre las filas de su misma tienda: tener el soundtrack
 * en Epic no es tener el juego en Epic. Un nombre tapado no tiene base.
 */
export function findNonGameBase<T extends BaseCandidate>(
  row: BaseCandidate,
  candidates: readonly T[],
): T | undefined {
  const nonGame = detectNonGame(row.title);

  if (nonGame?.kind !== "suffix" || row.storeId === null) {
    return undefined;
  }

  return candidates.find(
    (candidate) =>
      candidate.storeId === row.storeId && !isNonGame(candidate.title) && titleKey(candidate.title) === nonGame.baseKey,
  );
}

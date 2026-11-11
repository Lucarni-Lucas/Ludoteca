const COMBINING_MARKS = /\p{Diacritic}/gu;

/** Compara sin mayúsculas ni acentos: «Pokémon» y «pokemon» son lo mismo. */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replaceAll(COMBINING_MARKS, "").toLowerCase().trim();
}

/**
 * Lo que va al final de un título y nombra una edición. Si IGDB no encuentra el título entero, se busca sin
 * esto (design.md §7). Una nueva se suma acá.
 */
export const EDITION_SUFFIXES = [
  "Deluxe Edition",
  "Digital Deluxe Edition",
  "Game of the Year Edition",
  "GOTY Edition",
  "GOTY",
  "Complete Edition",
  "Complete",
  "Definitive Edition",
  "Ultimate Edition",
  "Gold Edition",
  "Premium Edition",
  "Standard Edition",
  "Special Edition",
  "Enhanced Edition",
] as const;

const SEPARATORS = String.raw`[^\p{L}\p{N}]`;

function suffixPattern(suffix: string): RegExp {
  const words = suffix.split(" ").join(`${SEPARATORS}+`);
  return new RegExp(`${SEPARATORS}+${words}${SEPARATORS}*$`, "iu");
}

// Primero las más largas: «Digital Deluxe Edition» antes que «Deluxe Edition».
const SUFFIX_PATTERNS = [...EDITION_SUFFIXES]
  .toSorted((a, b) => b.split(" ").length - a.split(" ").length)
  .map(suffixPattern);

const HAS_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

/**
 * El título sin la edición del final ni los separadores que quedan colgando, o `null` si no nombra ninguna:
 * «Styx: Shards of Darkness - Deluxe Edition» → «Styx: Shards of Darkness». Tiene que quedar algo antes.
 */
export function withoutEdition(title: string): string | null {
  for (const pattern of SUFFIX_PATTERNS) {
    const match = pattern.exec(title);

    if (match) {
      const rest = title.slice(0, match.index).trim();
      return HAS_LETTER_OR_NUMBER.test(rest) ? rest : null;
    }
  }

  return null;
}

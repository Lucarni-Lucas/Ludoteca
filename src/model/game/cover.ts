const SKIPPED_WORDS = new Set(["de", "del", "la", "el", "los", "las", "of", "the"]);
const NOT_LETTER_OR_NUMBER_OR_SPACE = /[^\p{L}\p{N}\s]/gu;
const MAX_INITIALS = 2;
const NO_INITIALS = "?";
const HASH_MULTIPLIER = 31;

export const COVER_TONE_COUNT = 6;

export function coverInitials(title: string): string {
  const words = title
    .replaceAll(NOT_LETTER_OR_NUMBER_OR_SPACE, "")
    .split(/\s+/u)
    .filter((word) => word !== "" && !SKIPPED_WORDS.has(word.toLowerCase()));

  const initials = words
    .slice(0, MAX_INITIALS)
    .map((word) => [...word][0])
    .join("");

  return (initials || NO_INITIALS).toUpperCase();
}

/** Un link a medio escribir no se intenta mostrar: rompería la imagen en lugar de caer a las iniciales. */
export function isDisplayableCover(url: string | null): url is string {
  return url !== null && URL.canParse(url) && /^https?:$/.test(new URL(url).protocol);
}

/** El mismo título da siempre el mismo tono, en el servidor y en el navegador. */
export function coverTone(title: string): number {
  let hash = 0;

  for (const character of title) {
    hash = (hash * HASH_MULTIPLIER + (character.codePointAt(0) ?? 0)) % COVER_TONE_COUNT;
  }

  return hash;
}

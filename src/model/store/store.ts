import { normalizeText } from "@/model/game/normalize-text";
import { InvalidStoreNameError } from "@/model/store/errors";

export const KNOWN_STORE_NAMES = [
  "Steam",
  "Epic Games",
  "GOG",
  "Microsoft Store",
  "Game Pass",
  "Nintendo Switch",
  "itch.io",
  "PlayStation",
  "EA app",
  "Ubisoft Connect",
  "Battle.net",
  "Amazon Games",
] as const;

export type Store = Readonly<{
  id: string;
  name: string;
  slug: string;
}>;

const NOT_ALPHANUMERIC = /[^a-z0-9]+/;

export function storeSlug(name: string): string {
  return normalizeText(name).split(NOT_ALPHANUMERIC).filter(Boolean).join("-");
}

export function assertValidStoreName(name: string): void {
  if (storeSlug(name) === "") {
    throw new InvalidStoreNameError();
  }
}

/** Quien escribe «steam» a mano está hablando de Steam: no se crea otra tienda. */
export function findStoreByName(stores: readonly Store[], name: string): Store | undefined {
  const slug = storeSlug(name);
  return stores.find((store) => store.slug === slug);
}

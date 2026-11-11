export const CATALOG_SOURCES = ["igdb", "manual"] as const;

export type CatalogSource = (typeof CATALOG_SOURCES)[number];

/** Lo que trae IGDB de un juego o lo que el usuario cargó a mano, antes de tener fila en el catálogo. */
export type CatalogGameData = Readonly<{
  title: string;
  year: number | null;
  developer: string | null;
  coverUrl: string | null;
  pageUrl: string | null;
  estimatedHours: number | null;
  endless: boolean;
}>;

export type IgdbGameData = CatalogGameData & Readonly<{ igdbId: number }>;

/** `baseIgdbId` es el juego principal: las ediciones se guardan y se reconocen por ese id. */
export type IgdbSearchResult = Readonly<{
  igdbId: number;
  baseIgdbId: number;
  title: string;
  year: number | null;
  coverUrl: string | null;
}>;

export type ProviderToken = Readonly<{
  accessToken: string;
  expiresAt: string;
}>;

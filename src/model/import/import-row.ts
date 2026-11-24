export const IMPORT_SOURCES = ["ign", "playnite", "steam"] as const;

export type ImportSource = (typeof IMPORT_SOURCES)[number];

/** Los estados de IGN con su nombre de siempre; `flags` usa otros nombres para algunos (design.md §5). */
export const IGN_STATUSES = ["playing", "paused", "backlog", "beat", "quit", "wishlist"] as const;

export type IgnStatus = (typeof IGN_STATUSES)[number];

/**
 * Una fila de un archivo o de la cuenta de Steam, ya leída por su adapter y antes de guardarse.
 * La tienda va por nombre: el adapter no conoce las tiendas de la base.
 */
export type ImportRow = Readonly<{
  source: ImportSource;
  /** El `ignId` en IGN, `<tienda>:<ID en la tienda>` en Playnite y el appid en Steam. */
  sourceKey: string;
  title: string;
  altTitles: readonly string[];
  year: number | null;
  storeName: string | null;
  storeGameId: string | null;
  /** Vacío si la fuente no informa horas o no son confiables (Steam desde Playnite), nunca 0 por defecto. */
  playtimeMinutes: number | null;
  ignStatuses: readonly IgnStatus[];
  ignScore: number | null;
  hltbMainHours: number | null;
  /** El ID de Steam que trae IGN: solo sirve para cruzar con IGDB, no es una copia. */
  steamAppId: string | null;
}>;

/** Lo que devuelve un adapter de archivo: las filas y cuántas se saltearon por no tener tienda. */
export type ImportFileRead = Readonly<{
  source: ImportSource;
  rows: readonly ImportRow[];
  skipped: number;
}>;

const BYTES_PER_MEGABYTE = 1024 * 1024;

/** El Route Handler acepta hasta 4,5 MB en Vercel; el export de IGN con 303 juegos ronda 1 MB (design.md §2). */
export const MAX_IMPORT_FILE_MEGABYTES = 4;
export const MAX_IMPORT_FILE_BYTES = MAX_IMPORT_FILE_MEGABYTES * BYTES_PER_MEGABYTE;

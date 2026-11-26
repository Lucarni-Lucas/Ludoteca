import type { CopyKind } from "@/model/copy/copy";
import type { IgdbGameData, IgdbSearchResult } from "@/model/game/catalog";
import type { ImportRow, ImportSource } from "@/model/import/import-row";
import type { Store } from "@/model/store/store";

export const MATCH_STATES = ["pending", "matched", "candidates", "not_found", "absorbed"] as const;

export type MatchState = (typeof MATCH_STATES)[number];

/** «Sí, algún día», «No» u «Ocultar», y «Ya lo jugué», en el orden en que quedaron en la base (design.md §21). */
export const PLAY_ANSWERS = ["keep", "hidden", "played"] as const;

export type PlayAnswer = (typeof PLAY_ANSWERS)[number];

/** Hasta 5 candidatos de IGDB, guardados para mostrarlos sin volver a consultar. */
export const MAX_CANDIDATES = 5;

export type ImportCandidate = IgdbSearchResult;

/** Una fila guardada de una fuente. `copyKind` y `excluded` son las decisiones sobre su copia. */
export type ImportItem = Readonly<{
  id: string;
  source: ImportSource;
  sourceKey: string;
  title: string;
  altTitles: readonly string[];
  year: number | null;
  store: Store | null;
  storeGameId: string | null;
  playtimeMinutes: number | null;
  ignStatuses: ImportRow["ignStatuses"];
  ignScore: number | null;
  hltbMainHours: number | null;
  steamAppId: string | null;
  matchState: MatchState;
  candidates: readonly ImportCandidate[];
  /** El juego que eligió el usuario entre los candidatos o con «Buscar con otro nombre»: es una decisión. */
  chosenIgdbId: number | null;
  entryId: string | null;
  copyKind: CopyKind | null;
  excluded: boolean;
}>;

/** La fila lista para guardar: la tienda ya se resolvió a su id. */
export type NewImportItem = Omit<ImportRow, "storeName"> & Readonly<{ storeId: string | null }>;

/** Las respuestas de un juego. Vacías, el juego muestra la sugerencia y sigue en su grupo (design.md §4). */
export type EntryAnswers = Readonly<{
  /** El estado elegido, por id: también puede ser uno creado por el usuario (design.md §4). */
  statusId: string | null;
  endlessAnswer: boolean | null;
  playAnswer: PlayAnswer | null;
  excluded: boolean;
  /** Con valor, el juego entra cargado a mano con este título (desde «No lo encontré»). */
  manualTitle: string | null;
}>;

export const NO_ANSWERS: EntryAnswers = {
  statusId: null,
  endlessAnswer: null,
  playAnswer: null,
  excluded: false,
  manualTitle: null,
};

/** Lo que el catálogo dice del juego cruzado; vacío si todavía no cruzó. */
export type EntryCatalog = Readonly<{
  title: string;
  year: number | null;
  coverUrl: string | null;
  estimatedHours: number | null;
  endless: boolean;
}>;

/** Un juego a revisar: uno por cada juego de IGDB, o uno por nombre mientras no cruza (design.md §4). */
export type ImportEntry = Readonly<{
  id: string;
  igdbId: number | null;
  catalogGameId: string | null;
  catalog: EntryCatalog | null;
  multiplayerOnly: boolean;
  answers: EntryAnswers;
  /** El juego de la biblioteca que ya se creó en una confirmación anterior. */
  libraryGameId: string | null;
  items: readonly ImportItem[];
}>;

/** Una copia que ya está en la biblioteca: se reconoce por tienda, con o sin ID en la tienda. */
export type OwnedCopy = Readonly<{ storeId: string; storeGameId: string | null }>;

export type LibraryMatch = Readonly<{
  catalogGameId: string;
  libraryGameId: string;
  copies: readonly OwnedCopy[];
}>;

/** Todo lo abierto de la revisión de un usuario, tal como está guardado. */
export type OpenReview = Readonly<{
  entries: readonly ImportEntry[];
  library: readonly LibraryMatch[];
  pendingCount: number;
  itemCount: number;
}>;

/** Lo que trae IGDB de un juego cruzado, con lo que solo sirve para la revisión. */
export type MatchedGame = IgdbGameData & Readonly<{ multiplayerOnly: boolean }>;

/**
 * Adónde va una fila que no cruzó y tiene el mismo nombre que otra (design.md §10): al juego a revisar abierto
 * `joinEntryId`, o al que crea en la misma tanda la fila `joinItemId`. Sin ninguno, crea el suyo.
 */
export type SameNameJoin = Readonly<{ joinEntryId?: string; joinItemId?: string }>;

export type ItemMatch =
  | Readonly<{ itemId: string; kind: "matched"; game: MatchedGame }>
  | (Readonly<{ itemId: string; kind: "candidates"; candidates: readonly ImportCandidate[] }> & SameNameJoin)
  /** Con `notAGame`, una entrada que no es juego y no encontró su base: nace en «No importar» (design.md §8). */
  | (Readonly<{ itemId: string; kind: "not_found"; notAGame?: true }> & SameNameJoin)
  /** Sin `baseItemId`, la fila se colgó de un juego que ya está en la biblioteca y no queda nada por hacer. */
  | Readonly<{ itemId: string; kind: "absorbed"; baseItemId: string | null }>;

/** El cambio sobre las copias de una tienda en los juegos elegidos. */
export type CopyDecision = Readonly<{ storeId: string; copyKind: CopyKind | null; excluded: boolean }>;

export type DecisionWrite = Readonly<{
  answers?: Partial<EntryAnswers>;
  copies?: CopyDecision;
}>;

/** Cuántas filas se leyeron de cada fuente y cuándo, para «303 juegos · leído el 23 nov». */
export type SourceSummary = Readonly<{
  source: ImportSource;
  itemCount: number;
  lastReadAt: string;
}>;

/** Un juego de la biblioteca con las tiendas donde tiene copia: ahí puede colgarse un soundtrack. */
export type LibraryTitle = Readonly<{ title: string; storeIds: readonly string[] }>;

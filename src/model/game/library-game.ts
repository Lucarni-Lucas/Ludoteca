import type { Copy } from "@/model/copy/copy";
import type { CatalogSource } from "@/model/game/catalog";
import type { Status } from "@/model/status/status";

const MINUTES_PER_HOUR = 60;
const DECIMAL_FACTOR = 10;

export type GameCorrections = Readonly<{
  estimatedHours: number | null;
  endless: boolean | null;
  coverUrl: string | null;
}>;

/** Datos planos: esta misma forma viaja al navegador, donde corren los filtros. */
export type LibraryGame = Readonly<{
  id: string;
  catalogGameId: string;
  igdbId: number | null;
  source: CatalogSource;
  title: string;
  year: number | null;
  developer: string | null;
  pageUrl: string | null;
  catalog: Readonly<{ estimatedHours: number | null; endless: boolean; coverUrl: string | null }>;
  corrections: GameCorrections;
  status: Status;
  statusSince: string;
  score: number | null;
  notInterested: boolean;
  addedAt: string;
  copies: readonly Copy[];
  /** El total que cargó el usuario; `null` si no cargó ninguno (design.md §20). */
  manualPlayedMinutes: number | null;
}>;

type GameData = Pick<LibraryGame, "catalog" | "corrections">;

export function effectiveEndless(game: GameData): boolean {
  return game.corrections.endless ?? game.catalog.endless;
}

/** Un juego sin fin no tiene duración, aunque el catálogo o una corrección vieja digan otra cosa. */
export function effectiveHours(game: GameData): number | null {
  return effectiveEndless(game) ? null : (game.corrections.estimatedHours ?? game.catalog.estimatedHours);
}

export function effectiveCover(game: GameData): string | null {
  return game.corrections.coverUrl ?? game.catalog.coverUrl;
}

export function formatHours(hours: number): string {
  return String(Math.round(hours * DECIMAL_FACTOR) / DECIMAL_FACTOR);
}

export function durationLabel(game: GameData): string {
  if (effectiveEndless(game)) {
    return "Sin fin";
  }

  const hours = effectiveHours(game);
  return hours === null ? "Duración desconocida" : `unas ${formatHours(hours)} h`;
}

/** De dónde sale la duración que se muestra; `null` si no hay ninguna o el juego es sin fin. */
export function durationSource(game: GameData & Pick<LibraryGame, "source">): "tuya" | "IGDB" | null {
  if (effectiveHours(game) === null) {
    return null;
  }

  if (game.corrections.estimatedHours !== null) {
    return "tuya";
  }

  return isManual(game) ? null : "IGDB";
}

export type CorrectionsForm = Readonly<{
  estimatedHours: number | null;
  endless: boolean;
  coverUrl: string | null;
}>;

/** Vacío significa «usá el catálogo»: si la marca coincide con la del catálogo, no es una corrección. */
export function toCorrections(game: GameData, form: CorrectionsForm): GameCorrections {
  return {
    estimatedHours: form.estimatedHours,
    endless: form.endless === game.catalog.endless ? null : form.endless,
    coverUrl: form.coverUrl,
  };
}

type PlayedData = Pick<LibraryGame, "copies" | "manualPlayedMinutes">;

/** El total a mano manda; si no hay, lo que dicen las copias. `07` suma las sesiones del diario. */
export function playedHours(game: PlayedData): number {
  const minutes =
    game.manualPlayedMinutes ?? game.copies.reduce((total, copy) => total + (copy.playtimeMinutes ?? 0), 0);
  return minutes / MINUTES_PER_HOUR;
}

/** Un juego sin copias ni total a mano no tiene horas que mostrar, filtrar ni ordenar. */
export function hasPlayedHours(game: PlayedData): boolean {
  return game.manualPlayedMinutes !== null || game.copies.length > 0;
}

export function isManual(game: Pick<LibraryGame, "source">): boolean {
  return game.source === "manual";
}

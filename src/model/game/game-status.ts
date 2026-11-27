import { effectiveEndless, type GameCorrections, type LibraryGame } from "@/model/game/library-game";
import {
  COMPLETED_KEY,
  type MarkChoice,
  planStatusChange,
  type Status,
  type StatusChangePlan,
  type StatusMarks,
  statusMarks,
} from "@/model/status/status";

/**
 * Cómo se guardan las marcas: «Sin fin» es una corrección (vacío es «la del catálogo») y «100%» es una columna
 * propia del juego (`04` design.md §22).
 */
export type MarksUpdate = Readonly<{ endless: boolean | null; hundredPercent: boolean }>;

export type GameStatusChange = Readonly<{
  /** Vacío si el estado no cambia: el diario solo guarda cambios de estado. */
  plan: StatusChangePlan | null;
  /** Vacío si ninguna marca cambia. */
  marks: MarksUpdate | null;
}>;

type MarkedGame = Pick<LibraryGame, "catalog" | "corrections" | "hundredPercent" | "hltbHours">;

export function currentMarks(game: MarkedGame): StatusMarks {
  return { endless: effectiveEndless(game), hundredPercent: game.hundredPercent ?? false };
}

/** Si la marca «Sin fin» queda igual a la del catálogo, no hace falta guardarla como corrección. */
function toMarksUpdate(game: Pick<LibraryGame, "catalog">, marks: StatusMarks): MarksUpdate {
  return { endless: marks.endless === game.catalog.endless ? null : marks.endless, hundredPercent: marks.hundredPercent };
}

function sameMarks(a: StatusMarks, b: StatusMarks): boolean {
  return a.endless === b.endless && a.hundredPercent === b.hundredPercent;
}

/** El cambio de estado y de marcas juntos: el servicio lo guarda en una sola operación. */
export function planGameStatusChange(
  game: MarkedGame & Readonly<{ status: Pick<Status, "id"> }>,
  target: Pick<Status, "id" | "systemKey">,
  today: string,
  choice: MarkChoice = {},
): GameStatusChange {
  const before = currentMarks(game);
  const after = statusMarks(before, target, choice);

  return {
    plan: planStatusChange(game, target, today),
    marks: sameMarks(before, after) ? null : toMarksUpdate(game, after),
  };
}

const NEW_GAME_MARKS: StatusMarks = { endless: false, hundredPercent: false };

/** Un juego nuevo todavía no es sin fin: «Jugado» le pone la marca, con el aviso aceptado. */
export function initialMarks(target: Pick<Status, "systemKey">, choice: MarkChoice = {}): MarksUpdate | null {
  const marks = statusMarks(NEW_GAME_MARKS, target, choice);
  return sameMarks(marks, NEW_GAME_MARKS) ? null : { endless: marks.endless ? true : null, hundredPercent: marks.hundredPercent };
}

/** «Lo completé al 100%» desde «Editar»: fuera de «Completado» la marca no existe, así que se ignora. */
export function correctionsToSave(game: Pick<LibraryGame, "status">, corrections: GameCorrections): GameCorrections {
  if (corrections.hundredPercent === undefined || game.status.systemKey === COMPLETED_KEY) {
    return corrections;
  }

  return { estimatedHours: corrections.estimatedHours, endless: corrections.endless, coverUrl: corrections.coverUrl };
}

import type { CopyKind } from "@/model/copy/copy";
import { keptCopies, type SuggestedCopy } from "@/model/import/copies";
import type { ImportEntry, OpenReview } from "@/model/import/import-entry";
import { type ReviewContext, type ReviewGame, reviewGame } from "@/model/import/review";
import { StatusNotFoundError } from "@/model/status/errors";

/** Por encima de esto, la confirmación va en tandas, cada una en su transacción (design.md §11). */
export const MAX_CONFIRM_ENTRIES = 600;

export type ImportedCopy = Readonly<{
  storeId: string;
  kind: CopyKind;
  storeGameId: string | null;
  playtimeMinutes: number | null;
}>;

/** El juego nuevo, con lo marcado. Sin entrada del diario: el estado inicial no es un cambio. */
export type ImportedGameValues = Readonly<{
  statusId: string;
  statusSince: string;
  score: number | null;
  hidden: boolean;
  /** `true` si se aceptó «sin fin»; vacío es «usá el catálogo». */
  endless: boolean | null;
  hltbHours: number | null;
}>;

export type ConfirmTarget =
  | Readonly<{ kind: "igdb"; catalogGameId: string; values: ImportedGameValues }>
  | Readonly<{ kind: "manual"; title: string; year: number | null; values: ImportedGameValues }>
  /** Ya está en la biblioteca: solo suma copias; el estado y el puntaje no se tocan. */
  | Readonly<{ kind: "existing"; libraryGameId: string }>;

export type ConfirmedGame = Readonly<{
  entryId: string;
  target: ConfirmTarget;
  copies: readonly ImportedCopy[];
}>;

export type ImportSummary = Readonly<{
  games: number;
  copies: number;
  hidden: number;
  /** Los juegos y las copias excluidos en esta confirmación. */
  excluded: number;
}>;

export type ImportConfirmationPlan = Readonly<{
  games: readonly ConfirmedGame[];
  /** Lo que queda confirmado, aunque no sume nada: los excluidos y los que ya estaban al día. */
  entryIds: readonly string[];
  summary: ImportSummary;
}>;

export const EMPTY_SUMMARY: ImportSummary = { games: 0, copies: 0, hidden: 0, excluded: 0 };

/** Un juego en «Listos para importar» siempre tiene estado: sin uno activo, pregunta en «Elegí un estado». */
function statusIdOf(game: ReviewGame): string {
  const { status } = game.suggestion;

  if (!status) {
    throw new StatusNotFoundError();
  }

  return status.id;
}

function toImportedCopy(copy: SuggestedCopy): ImportedCopy {
  return {
    storeId: copy.store.id,
    kind: copy.kind,
    storeGameId: copy.storeGameId,
    playtimeMinutes: copy.playtimeMinutes,
  };
}

function valuesOf(game: ReviewGame, today: string): ImportedGameValues {
  const { suggestion } = game;

  return {
    statusId: statusIdOf(game),
    statusSince: today,
    score: suggestion.score,
    hidden: suggestion.hidden,
    endless: suggestion.endless ? true : null,
    hltbHours: suggestion.hltbHours,
  };
}

function targetOf(game: ReviewGame, entry: ImportEntry, today: string): ConfirmTarget | null {
  if (game.libraryGameId) {
    return { kind: "existing", libraryGameId: game.libraryGameId };
  }

  if (entry.catalogGameId) {
    return { kind: "igdb", catalogGameId: entry.catalogGameId, values: valuesOf(game, today) };
  }

  // Sin cruce ni «Cargar a mano» no hay qué crear: el juego sigue esperando.
  return entry.answers.manualTitle
    ? { kind: "manual", title: entry.answers.manualTitle, year: game.year, values: valuesOf(game, today) }
    : null;
}

function countExcludedCopies(game: ReviewGame): number {
  return game.suggestion.copies.filter((copy) => copy.excluded).length;
}

type PlanParts = { games: ConfirmedGame[]; entryIds: string[]; summary: ImportSummary };

function addGame(parts: PlanParts, game: ReviewGame, target: ConfirmTarget): void {
  const copies = keptCopies(game.suggestion.copies).map(toImportedCopy);
  const isNew = target.kind !== "existing";

  parts.games.push({ entryId: game.entryId, target, copies });
  parts.entryIds.push(game.entryId);
  parts.summary = addSummaries(parts.summary, {
    games: isNew ? 1 : 0,
    copies: copies.length,
    hidden: isNew && game.suggestion.hidden ? 1 : 0,
    excluded: countExcludedCopies(game),
  });
}

function addExcluded(parts: PlanParts, entry: ImportEntry): void {
  parts.entryIds.push(entry.id);
  parts.summary = addSummaries(parts.summary, { ...EMPTY_SUMMARY, excluded: 1 });
}

export type ConfirmContext = ReviewContext & Readonly<{ today: string }>;

/** Confirma lo que está en «Listos para importar»: los demás grupos siguen esperando (design.md §11). */
export function planImportConfirmation(open: OpenReview, context: ConfirmContext): ImportConfirmationPlan {
  const parts: PlanParts = { games: [], entryIds: [], summary: EMPTY_SUMMARY };

  for (const entry of open.entries) {
    // Excluido por el usuario, o lo que no es un juego (design.md §8): no entra, y se confirma para que no vuelva.
    if (entry.answers.excluded) {
      addExcluded(parts, entry);
      continue;
    }

    const game = reviewGame(entry, open.library, context);

    if (game === null) {
      // Ya estaba con todas sus copias: se confirma para que no vuelva a la revisión.
      parts.entryIds.push(entry.id);
      continue;
    }

    const target = game.group === "ready" ? targetOf(game, entry, context.today) : null;

    if (target) {
      addGame(parts, game, target);
    }
  }

  return parts;
}

/** Suma los resúmenes de las tandas de una confirmación grande. */
export function addSummaries(a: ImportSummary, b: ImportSummary): ImportSummary {
  return {
    games: a.games + b.games,
    copies: a.copies + b.copies,
    hidden: a.hidden + b.hidden,
    excluded: a.excluded + b.excluded,
  };
}

export function isEmptyPlan(plan: ImportConfirmationPlan): boolean {
  return plan.games.length === 0;
}

/**
 * Parte una confirmación grande en tandas de hasta `size` juegos, cada una en su transacción. Los juegos
 * que solo se marcan (excluidos o al día) van con la última, para que una falla no los deje confirmados solos.
 */
export function splitConfirmationPlan(plan: ImportConfirmationPlan, size: number): readonly ImportConfirmationPlan[] {
  const gameEntryIds = new Set(plan.games.map((game) => game.entryId));
  const markedOnly = plan.entryIds.filter((entryId) => !gameEntryIds.has(entryId));
  const parts: ImportConfirmationPlan[] = [];

  for (let start = 0; start < Math.max(plan.games.length, 1); start += size) {
    const games = plan.games.slice(start, start + size);
    const isLast = start + size >= plan.games.length;
    parts.push({
      games,
      entryIds: [...games.map((game) => game.entryId), ...(isLast ? markedOnly : [])],
      summary: EMPTY_SUMMARY,
    });
  }

  return parts;
}

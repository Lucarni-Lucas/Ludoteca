import type { CopyKind } from "@/model/copy/copy";
import { InvalidImportDecisionError } from "@/model/import/errors";
import type { DecisionWrite, ImportCandidate } from "@/model/import/import-entry";
import type { ReviewChoice, ReviewGame } from "@/model/import/review";
import { BACKLOG_KEY, endlessChangeOf, findStatusByKey, type Status } from "@/model/status/status";
import { STEAM_SLUG } from "@/model/store/store";

/** Lo que el usuario hace con uno o varios juegos de un grupo. */
export type ImportDecision =
  /** Una de las respuestas de la fila o de la barra de selección. */
  | Readonly<{ kind: "choose"; choice: ReviewChoice }>
  /** «Volver a revisar»: borra las respuestas y el juego vuelve a su grupo. */
  | Readonly<{ kind: "reset" }>
  /** «¿Cómo lo conseguiste?»: cambia el tipo de la copia de una tienda. */
  | Readonly<{ kind: "copy_kind"; storeId: string; copyKind: CopyKind }>;

export type DecisionPlan = Readonly<{
  /** Las respuestas iguales van juntas: cada una se guarda en una sola consulta. */
  writes: readonly Readonly<{ entryIds: readonly string[]; write: DecisionWrite }>[];
  resets: readonly string[];
  /** Un candidato elegido pide los datos del juego a IGDB antes de guardarse. */
  candidates: readonly Readonly<{ entryId: string; candidate: ImportCandidate }>[];
}>;

/** Los estados activos del usuario: el elegido tiene que estar entre los que se le ofrecen al juego. */
export type DecisionContext = Readonly<{ statuses: readonly Status[] }>;

type GameWrite =
  | Readonly<{ kind: "write"; write: DecisionWrite }>
  | Readonly<{ kind: "candidate"; candidate: ImportCandidate }>
  | Readonly<{ kind: "none" }>;

const NO_WRITE: GameWrite = { kind: "none" };

function answer(answers: DecisionWrite["answers"]): GameWrite {
  return { kind: "write", write: { answers } };
}

function invalid(): never {
  throw new InvalidImportDecisionError();
}

function sameChoice(a: ReviewChoice, b: ReviewChoice): boolean {
  if (a.kind === "candidate" && b.kind === "candidate") {
    return a.candidate.igdbId === b.candidate.igdbId;
  }

  return JSON.stringify(a) === JSON.stringify(b);
}

function assertOffered(game: ReviewGame, choice: ReviewChoice): void {
  if (!game.choices.some((offered) => sameChoice(offered, choice))) {
    invalid();
  }
}

/** La copia de una tienda que el juego sumaría; «Familia» solo existe en Steam. */
function copyWrite(game: ReviewGame, storeId: string, copyKind: CopyKind): GameWrite {
  const copy = game.suggestion.copies.find((suggested) => suggested.store.id === storeId);

  if (!copy || (copyKind === "family" && copy.store.slug !== STEAM_SLUG)) {
    invalid();
  }

  return { kind: "write", write: { copies: { storeId, copyKind, excluded: false } } };
}

/** «Sí, es de mi familia» y «No, es mío» son sobre la copia de Steam. */
function steamCopyWrite(game: ReviewGame, copyKind: CopyKind): GameWrite {
  const steam = game.suggestion.copies.find((copy) => copy.store.slug === STEAM_SLUG);
  return steam ? copyWrite(game, steam.store.id, copyKind) : invalid();
}

/**
 * Uno de «Otro estado»: cualquier estado activo. Si cambia la marca «Sin fin» (Jugado en un juego que no es solo
 * multijugador, Completado en uno que sí), la respuesta trae el aviso aceptado en `endless`, y se guarda en
 * `endless_answer` como si se hubiera contestado «¿Es sin fin?» (`04` design.md §22).
 */
function otherStatusWrite(game: ReviewGame, status: Status, endless: boolean | undefined): GameWrite {
  const change = endlessChangeOf(game.endless, status);

  if (change === null) {
    return answer({ statusId: status.id });
  }

  return endless === change ? answer({ statusId: status.id, endlessAnswer: change }) : invalid();
}

/**
 * Una respuesta fija de la fila vale tal cual, sin aviso: Overwatch, solo multijugador, con «Lo terminaste» sigue
 * después a «¿Es sin fin?». Si no es de la fila, es de «Otro estado».
 */
function statusWrite(game: ReviewGame, choice: Extract<ReviewChoice, { kind: "status" }>, context: DecisionContext): GameWrite {
  const inRow = game.choices.some((offered) => offered.kind === "status" && offered.status.id === choice.status.id);

  if (inRow) {
    return answer({ statusId: choice.status.id });
  }

  const status = context.statuses.find(({ id }) => id === choice.status.id);
  return status ? otherStatusWrite(game, status, choice.endless) : invalid();
}

/** «Ocultar»: entra oculto, en el Backlog del usuario. */
function hideWrite(context: DecisionContext): GameWrite {
  const backlog = findStatusByKey(context.statuses, BACKLOG_KEY);
  return backlog ? answer({ statusId: backlog.id, playAnswer: "hidden" }) : invalid();
}

function offeredWrite(game: ReviewGame, choice: ReviewChoice, context: DecisionContext): GameWrite {
  assertOffered(game, choice);

  switch (choice.kind) {
    case "candidate":
      return { kind: "candidate", candidate: choice.candidate };
    case "manual":
      return answer({ manualTitle: game.title });
    case "exclude":
      // «No importar» deja afuera el juego entero en todos los grupos (design.md §9).
      return answer({ excluded: true });
    case "endless":
      return answer({ endlessAnswer: true });
    case "completed":
      return answer({ endlessAnswer: false });
    case "keep":
      return answer({ playAnswer: "keep" });
    case "played":
      return answer({ playAnswer: "played" });
    case "hidden":
      return answer({ playAnswer: "hidden" });
    case "hide":
      return hideWrite(context);
    default:
      // «Buscar con otro nombre» y «Otro estado» solo abren algo para elegir: no deciden nada.
      return invalid();
  }
}

function choiceWrite(game: ReviewGame, choice: ReviewChoice, context: DecisionContext): GameWrite {
  if (choice.kind === "status") {
    return statusWrite(game, choice, context);
  }

  if (choice.kind === "copy_kind") {
    return steamCopyWrite(game, choice.copyKind);
  }

  return offeredWrite(game, choice, context);
}

function gameWrite(game: ReviewGame, decision: ImportDecision, context: DecisionContext): GameWrite {
  switch (decision.kind) {
    case "choose":
      return choiceWrite(game, decision.choice, context);
    case "copy_kind":
      return copyWrite(game, decision.storeId, decision.copyKind);
    case "reset":
      return NO_WRITE;
  }
}

function addWrite(writes: Map<string, { entryIds: string[]; write: DecisionWrite }>, entryId: string, write: DecisionWrite) {
  const key = JSON.stringify(write);
  const group = writes.get(key) ?? { entryIds: [], write };
  group.entryIds.push(entryId);
  writes.set(key, group);
}

/** Valida la decisión en cada juego antes de guardar nada: una que no vale frena todo el lote. */
export function planDecision(
  games: readonly ReviewGame[],
  decision: ImportDecision,
  context: DecisionContext,
): DecisionPlan {
  if (decision.kind === "reset") {
    return { writes: [], resets: games.map((game) => game.entryId), candidates: [] };
  }

  const writes = new Map<string, { entryIds: string[]; write: DecisionWrite }>();
  const candidates: { entryId: string; candidate: ImportCandidate }[] = [];

  for (const game of games) {
    const result = gameWrite(game, decision, context);

    if (result.kind === "write") {
      addWrite(writes, game.entryId, result.write);
    } else if (result.kind === "candidate") {
      candidates.push({ entryId: game.entryId, candidate: result.candidate });
    }
  }

  return { writes: [...writes.values()], resets: [], candidates };
}

/** Lo que dice el aviso: «Beholder pasó a «Listos para importar», oculto.» */
export function decidedChoice(decision: ImportDecision): ReviewChoice | null {
  return decision.kind === "choose" ? decision.choice : null;
}

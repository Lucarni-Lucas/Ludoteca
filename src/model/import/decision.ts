import type { CopyKind } from "@/model/copy/copy";
import { InvalidImportDecisionError } from "@/model/import/errors";
import type { DecisionWrite, ImportCandidate } from "@/model/import/import-entry";
import { isQuestionGroup, type ReviewChoice, type ReviewGame } from "@/model/import/review";
import { STEAM_SLUG } from "@/model/store/store";

/** Lo que el usuario hace con uno o varios juegos de un grupo. */
export type ImportDecision =
  /** Una de las opciones de la fila o de la barra de selección. */
  | Readonly<{ kind: "choose"; choice: ReviewChoice }>
  /** «Pasar a Listos»: guarda la sugerencia marcada como respuesta. Solo en los grupos de lote. */
  | Readonly<{ kind: "accept" }>
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

export type DecisionContext = Readonly<{ statusKeys: readonly string[] }>;

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
function copyWrite(game: ReviewGame, storeId: string, copyKind: CopyKind | null, excluded: boolean): GameWrite {
  const copy = game.suggestion.copies.find((suggested) => suggested.store.id === storeId);

  if (!copy || (copyKind === "family" && copy.store.slug !== STEAM_SLUG)) {
    invalid();
  }

  return { kind: "write", write: { copies: { storeId, copyKind, excluded } } };
}

/** Las opciones del grupo «¿Es de tu familia?» son sobre la copia de Steam. */
function steamCopyWrite(game: ReviewGame, copyKind: CopyKind | null, excluded: boolean): GameWrite {
  const steam = game.suggestion.copies.find((copy) => copy.store.slug === STEAM_SLUG);
  return steam ? copyWrite(game, steam.store.id, copyKind, excluded) : invalid();
}

function statusWrite(statusKey: string, context: DecisionContext): GameWrite {
  return context.statusKeys.includes(statusKey) ? answer({ statusKey }) : invalid();
}

function offeredWrite(game: ReviewGame, choice: ReviewChoice): GameWrite {
  assertOffered(game, choice);

  switch (choice.kind) {
    case "candidate":
      return { kind: "candidate", candidate: choice.candidate };
    case "manual":
      return answer({ manualTitle: game.title });
    case "exclude":
      return answer({ excluded: true });
    case "exclude_copy":
      return steamCopyWrite(game, null, true);
    case "endless":
      return answer({ endlessAnswer: true });
    case "completed":
      return answer({ endlessAnswer: false });
    case "keep":
      return answer({ playAnswer: "keep" });
    case "not_interested":
      return answer({ playAnswer: "not_interested" });
    default:
      // «Buscar con otro nombre», «Otro estado» y «Otro tipo» solo abren un campo: no deciden nada.
      return invalid();
  }
}

function choiceWrite(game: ReviewGame, choice: ReviewChoice, context: DecisionContext): GameWrite {
  if (choice.kind === "status") {
    return statusWrite(choice.statusKey, context);
  }

  if (choice.kind === "copy_kind") {
    return steamCopyWrite(game, choice.copyKind, false);
  }

  return offeredWrite(game, choice);
}

/** En una pregunta de a un juego no hay nada marcado que guardar: elige el usuario. */
function acceptWrite(game: ReviewGame, context: DecisionContext): GameWrite {
  if (isQuestionGroup(game.group)) {
    invalid();
  }

  // «Listos para importar», o Steam sin conectar: no hay nada que pasar.
  return game.marked ? choiceWrite(game, game.marked, context) : NO_WRITE;
}

function gameWrite(game: ReviewGame, decision: ImportDecision, context: DecisionContext): GameWrite {
  switch (decision.kind) {
    case "choose":
      return choiceWrite(game, decision.choice, context);
    case "accept":
      return acceptWrite(game, context);
    case "copy_kind":
      return copyWrite(game, decision.storeId, decision.copyKind, false);
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

/** Lo que dice el aviso: «Beholder pasó a «Listos para importar» con «Sin interés».» */
export function decidedChoice(game: ReviewGame, decision: ImportDecision): ReviewChoice | null {
  if (decision.kind === "choose") {
    return decision.choice;
  }

  return decision.kind === "accept" ? game.marked : null;
}

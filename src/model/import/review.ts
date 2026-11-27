import type { CopyKind } from "@/model/copy/copy";
import { keptCopies, type SuggestedCopy, suggestCopies } from "@/model/import/copies";
import { scoreFromIgn, suggestIgnStatus } from "@/model/import/ign-status";
import type {
  ImportCandidate,
  ImportEntry,
  ImportItem,
  LibraryMatch,
  OpenReview,
} from "@/model/import/import-entry";
import { MAX_CANDIDATES } from "@/model/import/import-entry";
import type { IgnStatus, ImportSource } from "@/model/import/import-row";
import { detectNonGame } from "@/model/import/non-game";
import { titleKey } from "@/model/import/title-match";
import { normalizeText } from "@/model/game/normalize-text";
import {
  ABANDONED_KEY,
  BACKLOG_KEY,
  COMPLETED_KEY,
  findStatusByKey,
  PLAYED_KEY,
  PLAYING_KEY,
  type Status,
  TRIED_KEY,
} from "@/model/status/status";

/** Con menos de esto jugado, un juego en Backlog pregunta si lo vas a jugar; con esto o más, cómo lo dejaste. */
export const MIN_PLAYED_MINUTES = 60;

/** Lo que la revisión necesita de un estado para ofrecerlo y nombrarlo. */
export type StatusRef = Pick<Status, "id" | "name" | "systemKey">;

/** En este orden: cada juego está en el primero que le toca (design.md §9). */
export const REVIEW_GROUPS = ["which", "how_left", "not_found", "family", "endless", "play", "status", "ready"] as const;

export type ReviewGroup = (typeof REVIEW_GROUPS)[number];

/** Las preguntas de a un juego: la respuesta depende de cada uno, así que en lote solo vale «No importar». */
const QUESTION_GROUPS: readonly ReviewGroup[] = ["which", "how_left", "not_found"];

/** «Volver a revisar» lleva a la primera pregunta: en las que dicen qué juego es, ya está ahí (design.md §9). */
export function canGoBack(game: Readonly<{ group: ReviewGroup; decided: boolean }>): boolean {
  return game.decided && game.group !== "which" && game.group !== "not_found";
}

export function isQuestionGroup(group: ReviewGroup): boolean {
  return QUESTION_GROUPS.includes(group);
}

/** Una respuesta a la pregunta del grupo, dicha en palabras. Ninguna viene marcada (design.md §9). */
export type ReviewChoice =
  | Readonly<{ kind: "candidate"; candidate: ImportCandidate }>
  | Readonly<{ kind: "search" }>
  /** Con `endless`, el aviso de «Sin fin» aceptado al elegirlo en «Otro estado» (`04` design.md §22). */
  | Readonly<{ kind: "status"; status: StatusRef; endless?: boolean }>
  | Readonly<{ kind: "other_status" }>
  | Readonly<{ kind: "manual" }>
  | Readonly<{ kind: "exclude" }>
  | Readonly<{ kind: "copy_kind"; copyKind: CopyKind }>
  | Readonly<{ kind: "endless" }>
  | Readonly<{ kind: "completed" }>
  | Readonly<{ kind: "keep" }>
  /** «Ya lo jugué»: no contesta el estado, pasa a «Elegí un estado». */
  | Readonly<{ kind: "played" }>
  /** «No» en «¿Lo vas a jugar alguna vez?»: entra oculto, en Backlog. */
  | Readonly<{ kind: "hidden" }>
  /** «Ocultar» en «Elegí un estado»: entra oculto, en Backlog. */
  | Readonly<{ kind: "hide" }>;

/** De dónde vino cada fila, para «IGN · Beat · 9» o «En Epic: Castlevania Anniversary Collection · 2019». */
export type ReviewOrigin = Readonly<{
  source: ImportSource;
  storeName: string | null;
  storeSlug: string | null;
  /** El nombre y el año con que llegó, antes de cruzar con IGDB. */
  title: string;
  year: number | null;
  ignStatuses: readonly IgnStatus[];
  ignScore: number | null;
  playtimeMinutes: number | null;
}>;

/** Lo que entraría a la biblioteca, ya con las decisiones aplicadas. */
export type ReviewSuggestion = Readonly<{
  /** Vacío si el estado que le tocaría no está activo: entonces el juego pregunta en «Elegí un estado». */
  status: StatusRef | null;
  score: number | null;
  hidden: boolean;
  endless: boolean;
  hltbHours: number | null;
  copies: readonly SuggestedCopy[];
}>;

export type ReviewGame = Readonly<{
  entryId: string;
  title: string;
  year: number | null;
  coverUrl: string | null;
  /** La duración que mostraría la ficha: la de IGDB o, si no hay, la de HowLongToBeat. */
  estimatedHours: number | null;
  origins: readonly ReviewOrigin[];
  group: ReviewGroup;
  choices: readonly ReviewChoice[];
  /** Un solo candidato con otro nombre: la pregunta es «¿Es este juego?». */
  isThisQuestion: boolean;
  /** Solo multijugador o «Sí, no se termina»: cambia qué estados se le ofrecen (design.md §19). */
  endless: boolean;
  /** Entra cargado a mano, con el título que trajo. */
  manual: boolean;
  /** Las filas del juego: después de «Volver a revisar» dicen adónde volvió, aunque cambie de juego a revisar. */
  itemIds: readonly string[];
  suggestion: ReviewSuggestion;
  /** Tiene alguna respuesta del usuario o del cruce: en cualquier grupo se puede volver a revisar. */
  decided: boolean;
  /** El juego ya está en la biblioteca: solo suma copias. */
  libraryGameId: string | null;
  /**
   * Una entrada que no es juego («Soundtrack», «Demo») que no encontró su base: en «Listos para importar» no se
   * importa, y traída con «Volver a revisar» está en «No lo encontré» (design.md §8).
   */
  nonGame: boolean;
  /** Tiene «No importar», del usuario o del cruce: está en «Listos para importar» como «No se importa». */
  excluded: boolean;
}>;

export type ReviewGroupView = Readonly<{ group: ReviewGroup; games: readonly ReviewGame[] }>;

export type ImportReview = Readonly<{
  groups: readonly ReviewGroupView[];
  /** Juegos que ya estaban en la biblioteca con todas sus copias. */
  upToDate: number;
  /** Juegos con «No importar»: también están en «Listos para importar», como «No se importa». */
  excluded: number;
  pendingCount: number;
  itemCount: number;
}>;

export type ReviewContext = Readonly<{
  steamConnected: boolean;
  /**
   * Los estados activos del usuario: un estado de fábrica se reconoce por su `system_key` aunque esté renombrado,
   * y una respuesta cuyo estado no está activo no se ofrece (design.md §9, «Los estados del usuario»).
   */
  statuses: readonly Status[];
}>;

/** Lo que se sabe de un juego antes de elegir su grupo. */
type EntryFacts = Readonly<{
  entry: ImportEntry;
  library: LibraryMatch | undefined;
  ignItems: readonly ImportItem[];
  copies: readonly SuggestedCopy[];
  /** Los estados activos que corresponden a los de IGN. */
  ignStatuses: readonly Status[];
  /** Algún estado de IGN no tiene un estado activo. */
  ignInactive: boolean;
  /** Solo multijugador, o se respondió que no se termina. */
  endless: boolean;
  statuses: readonly Status[];
  decided: boolean;
}>;


function ignItemsOf(entry: ImportEntry): readonly ImportItem[] {
  return entry.items.filter((item) => item.source === "ign");
}

function ignStatusesOf(items: readonly ImportItem[]): readonly IgnStatus[] {
  return [...new Set(items.flatMap((item) => item.ignStatuses))];
}

function ignStatusKeys(items: readonly ImportItem[]): readonly string[] {
  const suggestion = suggestIgnStatus(ignStatusesOf(items));

  if (suggestion.kind === "none") {
    return [];
  }

  return suggestion.kind === "single" ? [suggestion.statusKey] : suggestion.statusKeys;
}

function activeByKeys(statuses: readonly Status[], keys: readonly string[]): readonly Status[] {
  return keys.flatMap((key) => findStatusByKey(statuses, key) ?? []);
}

function toRef(status: Status): StatusRef {
  return { id: status.id, name: status.name, systemKey: status.systemKey };
}

function firstScore(items: readonly ImportItem[]): number | null {
  return items.map((item) => scoreFromIgn(item.ignScore)).find((score) => score !== null) ?? null;
}

function hltbOf(items: readonly ImportItem[]): number | null {
  return items.find((item) => item.hltbMainHours !== null)?.hltbMainHours ?? null;
}

function hasChosenGame(entry: ImportEntry): boolean {
  return entry.items.some((item) => item.chosenIgdbId !== null);
}

function isDecided(entry: ImportEntry, copies: readonly SuggestedCopy[]): boolean {
  const { statusId, endlessAnswer, playAnswer, manualTitle } = entry.answers;
  const answered = [statusId, endlessAnswer, playAnswer, manualTitle].some((answer) => answer !== null);

  return answered || copies.some((copy) => copy.chosen) || hasChosenGame(entry);
}

/**
 * El elegido, si no el de IGN, si no Backlog. Si IGN lo trae solo en estados desactivados no hay sugerencia: no
 * se adivina otro estado.
 */
function baseStatus(facts: EntryFacts): Status | null {
  const { statusId } = facts.entry.answers;

  if (statusId !== null) {
    return facts.statuses.find((status) => status.id === statusId) ?? null;
  }

  if (facts.ignInactive && facts.ignStatuses.length === 0) {
    return null;
  }

  return facts.ignStatuses[0] ?? findStatusByKey(facts.statuses, BACKLOG_KEY) ?? null;
}

function suggestedStatus(facts: EntryFacts): Status | null {
  if (facts.entry.answers.endlessAnswer === true) {
    return findStatusByKey(facts.statuses, PLAYED_KEY) ?? null;
  }

  return baseStatus(facts);
}

function suggestionOf(facts: EntryFacts): ReviewSuggestion {
  const { entry, ignItems, copies } = facts;
  const status = suggestedStatus(facts);

  return {
    status: status ? toRef(status) : null,
    score: firstScore(ignItems),
    hidden: entry.answers.playAnswer === "hidden",
    // «Jugado» solo existe para un juego sin fin: entra con la marca aunque IGDB no lo diga.
    endless: entry.answers.endlessAnswer === true || status?.systemKey === PLAYED_KEY,
    hltbHours: hltbOf(ignItems),
    copies,
  };
}

/** Una fila con un juego elegido ya no espera respuesta, aunque su cruce siga diciendo lo que dio. */
function hasOpenState(entry: ImportEntry, state: ImportItem["matchState"]): boolean {
  return entry.items.some((item) => item.matchState === state && item.chosenIgdbId === null);
}

function needsStatusChoice(facts: EntryFacts): boolean {
  return facts.entry.answers.statusId === null && facts.ignStatuses.length > 1;
}

function knownHours(copies: readonly SuggestedCopy[]): readonly number[] {
  return keptCopies(copies).flatMap((copy) => (copy.playtimeMinutes === null ? [] : [copy.playtimeMinutes]));
}

/** Sin ninguna copia con horas conocidas no hay total: `null` (design.md §9, «Las horas de 6 y 7»). */
function playedMinutes(copies: readonly SuggestedCopy[]): number | null {
  const hours = knownHours(copies);
  return hours.length === 0 ? null : hours.reduce((total, minutes) => total + minutes, 0);
}

function isPlayQuestion(facts: EntryFacts, suggestion: ReviewSuggestion): boolean {
  const { statusId, playAnswer } = facts.entry.answers;
  const minutes = playedMinutes(facts.copies);

  return (
    suggestion.status?.systemKey === BACKLOG_KEY &&
    statusId === null &&
    playAnswer === null &&
    suggestion.score === null &&
    minutes !== null &&
    minutes < MIN_PLAYED_MINUTES
  );
}

/** «Ya lo jugué», o jugado sin un estado de IGN que sirva, o un estado que no está activo (design.md §9). */
function isStatusQuestion(facts: EntryFacts, suggestion: ReviewSuggestion): boolean {
  const { statusId, playAnswer } = facts.entry.answers;

  if (statusId !== null || playAnswer === "hidden") {
    return false;
  }

  if (playAnswer === "played" || suggestion.status === null) {
    return true;
  }

  const minutes = playedMinutes(facts.copies);
  return suggestion.status.systemKey === BACKLOG_KEY && minutes !== null && minutes >= MIN_PLAYED_MINUTES;
}

function isFamilyQuestion(copies: readonly SuggestedCopy[]): boolean {
  return copies.some((copy) => copy.awaitingSteam || (copy.familySuggested && !copy.chosen));
}

function isEndlessQuestion(facts: EntryFacts, suggestion: ReviewSuggestion): boolean {
  return (
    suggestion.status?.systemKey === COMPLETED_KEY && facts.entry.multiplayerOnly && facts.entry.answers.endlessAnswer === null
  );
}

/** Cargado a mano, el juego ya dice qué es aunque sus filas sigan sin cruce. */
function isIdentified(entry: ImportEntry): boolean {
  return entry.answers.manualTitle !== null;
}

/** Las preguntas de a un juego van primero: sin saber qué juego es, lo demás no se puede decidir. */
function questionOf(facts: EntryFacts): ReviewGroup | null {
  const identified = isIdentified(facts.entry);

  if (!identified && hasOpenState(facts.entry, "candidates")) {
    return "which";
  }

  if (needsStatusChoice(facts)) {
    return "how_left";
  }

  return !identified && hasOpenState(facts.entry, "not_found") ? "not_found" : null;
}

/**
 * El primer grupo cuya pregunta el juego todavía no contestó: cada respuesta contesta solo la suya, también
 * decir qué juego es, y el juego sigue al grupo que le toque (design.md §9).
 */
function groupOf(facts: EntryFacts, suggestion: ReviewSuggestion): ReviewGroup {
  const question = questionOf(facts);

  if (question) {
    return question;
  }

  if (isFamilyQuestion(facts.copies)) {
    return "family";
  }

  // Un juego que ya está en la biblioteca no cambia de estado: no pasa por las preguntas que lo deciden.
  if (facts.library) {
    return "ready";
  }

  if (isEndlessQuestion(facts, suggestion)) {
    return "endless";
  }

  if (isPlayQuestion(facts, suggestion)) {
    return "play";
  }

  return isStatusQuestion(facts, suggestion) ? "status" : "ready";
}

function openItems(entry: ImportEntry): readonly ImportItem[] {
  return entry.items.filter((item) => item.chosenIgdbId === null && item.matchState !== "absorbed");
}

/**
 * Los candidatos de todas las filas que esperan, en el orden de la primera y sin repetir el juego base: el
 * mismo nombre de varias fuentes es una sola pregunta (design.md §9).
 */
function candidatesOf(entry: ImportEntry): readonly ImportCandidate[] {
  const all = openItems(entry).flatMap((item) => (item.matchState === "candidates" ? item.candidates : []));
  const unique = new Map<number, ImportCandidate>();

  for (const candidate of all) {
    if (!unique.has(candidate.baseIgdbId)) {
      unique.set(candidate.baseIgdbId, candidate);
    }
  }

  return [...unique.values()].slice(0, MAX_CANDIDATES);
}

/** Un solo candidato, y ninguno de los nombres con que llegó es el suyo. */
function isThisQuestion(entry: ImportEntry): boolean {
  const candidates = candidatesOf(entry);

  if (candidates.length !== 1) {
    return false;
  }

  const keys = new Set(openItems(entry).flatMap((item) => [item.title, ...item.altTitles]).map(titleKey));
  return !keys.has(titleKey(candidates[0].title));
}

function isNonGameEntry(entry: ImportEntry): boolean {
  return entry.items.every((item) => detectNonGame(item.title) !== null);
}

const EXCLUDE: ReviewChoice = { kind: "exclude" };
const OTHER_STATUS: ReviewChoice = { kind: "other_status" };

/** Las respuestas de «Elegí un estado», en este orden; «Otro estado» abre la lista (design.md §9). */
export const STATUS_ANSWER_KEYS = [PLAYING_KEY, COMPLETED_KEY, ABANDONED_KEY, TRIED_KEY] as const;

/** Las de un juego sin fin: «Lo sigo jugando», «Ya no lo juego» y «Lo probé». */
export const ENDLESS_STATUS_ANSWER_KEYS = [PLAYING_KEY, PLAYED_KEY, TRIED_KEY] as const;

function whichChoices(entry: ImportEntry): readonly ReviewChoice[] {
  const candidates = candidatesOf(entry).map((candidate) => ({ kind: "candidate" as const, candidate }));
  return [...candidates, { kind: "search" }, EXCLUDE];
}

function statusChoice(status: Status): ReviewChoice {
  return { kind: "status", status: toRef(status) };
}

function howLeftChoices(facts: EntryFacts): readonly ReviewChoice[] {
  return [...facts.ignStatuses.map(statusChoice), OTHER_STATUS, EXCLUDE];
}

function familyChoices(copies: readonly SuggestedCopy[]): readonly ReviewChoice[] {
  if (copies.some((copy) => copy.awaitingSteam)) {
    return [];
  }

  return [{ kind: "copy_kind", copyKind: "family" }, { kind: "copy_kind", copyKind: "purchased" }, EXCLUDE];
}

function hasActive(facts: EntryFacts, systemKey: string): boolean {
  return findStatusByKey(facts.statuses, systemKey) !== undefined;
}

/** Una respuesta fija cuyo estado no está activo no se ofrece; «Ocultar» necesita un Backlog activo. */
function statusChoices(facts: EntryFacts): readonly ReviewChoice[] {
  const keys = facts.endless ? ENDLESS_STATUS_ANSWER_KEYS : STATUS_ANSWER_KEYS;
  const answers = activeByKeys(facts.statuses, keys).map(statusChoice);
  const hide: readonly ReviewChoice[] = hasActive(facts, BACKLOG_KEY) ? [{ kind: "hide" }] : [];
  return [...answers, OTHER_STATUS, ...hide, EXCLUDE];
}

function endlessChoices(facts: EntryFacts): readonly ReviewChoice[] {
  const endless: readonly ReviewChoice[] = hasActive(facts, PLAYED_KEY) ? [{ kind: "endless" }] : [];
  return [...endless, { kind: "completed" }, EXCLUDE];
}

const NOT_FOUND_CHOICES: readonly ReviewChoice[] = [{ kind: "search" }, { kind: "manual" }, EXCLUDE];
// Solo pregunta un juego que entraría en un Backlog activo, así que las cuatro se ofrecen siempre.
const PLAY_CHOICES: readonly ReviewChoice[] = [{ kind: "keep" }, { kind: "played" }, { kind: "hidden" }, EXCLUDE];

/** Las respuestas de cada grupo, ninguna marcada (design.md §9). */
function choicesOf(group: ReviewGroup, facts: EntryFacts): readonly ReviewChoice[] {
  switch (group) {
    case "which":
      return whichChoices(facts.entry);
    case "how_left":
      return howLeftChoices(facts);
    case "not_found":
      return NOT_FOUND_CHOICES;
    case "family":
      return familyChoices(facts.copies);
    case "endless":
      return endlessChoices(facts);
    case "play":
      return PLAY_CHOICES;
    case "status":
      return statusChoices(facts);
    case "ready":
      return [];
  }
}

function originOf(item: ImportItem): ReviewOrigin {
  return {
    source: item.source,
    storeName: item.store?.name ?? null,
    storeSlug: item.store?.slug ?? null,
    title: item.title,
    year: item.year,
    ignStatuses: item.ignStatuses,
    ignScore: item.ignScore,
    playtimeMinutes: item.playtimeMinutes,
  };
}

function titleOf(entry: ImportEntry): string {
  return entry.answers.manualTitle ?? entry.catalog?.title ?? entry.items[0].title;
}

function factsOf(entry: ImportEntry, library: readonly LibraryMatch[], context: ReviewContext): EntryFacts {
  const match = library.find((game) => game.catalogGameId === entry.catalogGameId);
  const ignItems = ignItemsOf(entry);
  const copies = suggestCopies(entry.items, {
    steamConnected: context.steamConnected,
    catalogTitle: entry.catalog?.title ?? null,
    library: match,
  });

  const keys = ignStatusKeys(ignItems);
  const ignStatuses = activeByKeys(context.statuses, keys);

  return {
    entry,
    library: match,
    ignItems,
    copies,
    ignStatuses,
    ignInactive: ignStatuses.length < keys.length,
    // Lo que se contestó manda sobre IGDB: «Completado» con el aviso le saca la marca a uno solo multijugador.
    endless: entry.answers.endlessAnswer ?? entry.multiplayerOnly,
    statuses: context.statuses,
    decided: isDecided(entry, copies),
  };
}

/**
 * `null` si no hay nada que revisar: un juego que ya estaba con todas sus copias. Uno con «No importar», del
 * usuario o del cruce, se ve en «Listos para importar» como «No se importa», para poder traerlo (design.md §9).
 */
export function reviewGame(entry: ImportEntry, library: readonly LibraryMatch[], context: ReviewContext): ReviewGame | null {
  const facts = factsOf(entry, library, context);
  const { excluded } = entry.answers;

  if (!excluded && facts.library && keptCopies(facts.copies).length === 0) {
    return null;
  }

  const suggestion = suggestionOf(facts);
  const group = excluded ? "ready" : groupOf(facts, suggestion);
  const firstItem = entry.items[0];

  return {
    entryId: entry.id,
    title: titleOf(entry),
    year: entry.catalog?.year ?? firstItem.year,
    coverUrl: entry.catalog?.coverUrl ?? null,
    estimatedHours: entry.catalog?.estimatedHours ?? suggestion.hltbHours,
    origins: entry.items.filter((item) => item.matchState !== "absorbed").map(originOf),
    group,
    choices: excluded ? [] : choicesOf(group, facts),
    isThisQuestion: group === "which" && isThisQuestion(entry),
    endless: facts.endless,
    manual: entry.answers.manualTitle !== null,
    itemIds: entry.items.map((item) => item.id),
    suggestion,
    decided: facts.decided || excluded,
    excluded,
    libraryGameId: facts.library?.libraryGameId ?? null,
    nonGame: hasOpenState(entry, "not_found") && isNonGameEntry(entry),
  };
}

function byTitle(a: ReviewGame, b: ReviewGame): number {
  return normalizeText(a.title).localeCompare(normalizeText(b.title));
}

/** La revisión se recalcula con cada decisión: nada de los grupos se guarda. */
export function buildReview(open: OpenReview, context: ReviewContext): ImportReview {
  const games: ReviewGame[] = [];
  let upToDate = 0;

  for (const entry of open.entries) {
    const game = reviewGame(entry, open.library, context);

    if (game) {
      games.push(game);
    } else {
      upToDate += 1;
    }
  }

  return {
    groups: REVIEW_GROUPS.map((group) => ({
      group,
      games: games.filter((game) => game.group === group).toSorted(byTitle),
    })),
    upToDate,
    excluded: games.filter((game) => game.excluded).length,
    pendingCount: open.pendingCount,
    itemCount: open.itemCount,
  };
}

export function gamesInGroup(review: ImportReview, group: ReviewGroup): readonly ReviewGame[] {
  return review.groups.find((view) => view.group === group)?.games ?? [];
}

export type ReadyCounts = Readonly<{ games: number; copies: number }>;

/** «En «Listos para importar»: 237 juegos y 252 copias.» */
export function countReady(review: ImportReview): ReadyCounts {
  const ready = gamesInGroup(review, "ready");

  // Lo que tiene «No importar», del usuario o del cruce, está en «Listos para importar» pero no entra (design.md §9).
  const entering = ready.filter((game) => !game.excluded);

  return {
    games: entering.filter((game) => game.libraryGameId === null).length,
    copies: entering.reduce((total, game) => total + keptCopies(game.suggestion.copies).length, 0),
  };
}

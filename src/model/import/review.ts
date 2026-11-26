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
import { BACKLOG_KEY } from "@/model/status/status";

const COMPLETED_KEY = "completed";
export const PLAYED_KEY = "played";

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
  | Readonly<{ kind: "status"; statusKey: string }>
  | Readonly<{ kind: "other_status" }>
  | Readonly<{ kind: "manual" }>
  | Readonly<{ kind: "exclude" }>
  | Readonly<{ kind: "copy_kind"; copyKind: CopyKind }>
  | Readonly<{ kind: "endless" }>
  | Readonly<{ kind: "completed" }>
  | Readonly<{ kind: "keep" }>
  | Readonly<{ kind: "not_interested" }>;

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
  statusKey: string;
  score: number | null;
  notInterested: boolean;
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
  /** Los `system_key` de los estados del usuario: una respuesta de «Elegí un estado» sin su estado no se ofrece. */
  statusKeys?: readonly string[];
}>;

/** Lo que se sabe de un juego antes de elegir su grupo. */
type EntryFacts = Readonly<{
  entry: ImportEntry;
  library: LibraryMatch | undefined;
  ignItems: readonly ImportItem[];
  copies: readonly SuggestedCopy[];
  ignStatusKeys: readonly string[];
  decided: boolean;
}>;


function ignItemsOf(entry: ImportEntry): readonly ImportItem[] {
  return entry.items.filter((item) => item.source === "ign");
}

function ignStatusesOf(items: readonly ImportItem[]): readonly IgnStatus[] {
  return [...new Set(items.flatMap((item) => item.ignStatuses))];
}

function ignStatusKeys(items: readonly ImportItem[], copies: readonly SuggestedCopy[]): readonly string[] {
  const suggestion = suggestIgnStatus(ignStatusesOf(items), keptCopies(copies).length > 0);

  if (suggestion.kind === "none") {
    return [];
  }

  return suggestion.kind === "single" ? [suggestion.statusKey] : suggestion.statusKeys;
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
  const { statusKey, endlessAnswer, playAnswer, manualTitle } = entry.answers;
  const answered = [statusKey, endlessAnswer, playAnswer, manualTitle].some((answer) => answer !== null);

  return answered || copies.some((copy) => copy.chosen) || hasChosenGame(entry);
}

function baseStatusKey(facts: EntryFacts): string {
  return facts.entry.answers.statusKey ?? facts.ignStatusKeys[0] ?? BACKLOG_KEY;
}

function suggestionOf(facts: EntryFacts): ReviewSuggestion {
  const { entry, ignItems, copies } = facts;
  const endless = entry.answers.endlessAnswer === true;

  return {
    statusKey: endless ? PLAYED_KEY : baseStatusKey(facts),
    score: firstScore(ignItems),
    notInterested: entry.answers.playAnswer === "not_interested",
    endless,
    hltbHours: hltbOf(ignItems),
    copies,
  };
}

/** Una fila con un juego elegido ya no espera respuesta, aunque su cruce siga diciendo lo que dio. */
function hasOpenState(entry: ImportEntry, state: ImportItem["matchState"]): boolean {
  return entry.items.some((item) => item.matchState === state && item.chosenIgdbId === null);
}

function needsStatusChoice(facts: EntryFacts): boolean {
  return facts.entry.answers.statusKey === null && facts.ignStatusKeys.length > 1;
}

function knownHours(copies: readonly SuggestedCopy[]): readonly number[] {
  return keptCopies(copies).flatMap((copy) => (copy.playtimeMinutes === null ? [] : [copy.playtimeMinutes]));
}

function isPlayQuestion(facts: EntryFacts, suggestion: ReviewSuggestion): boolean {
  const hours = knownHours(facts.copies);
  const neverPlayed = hours.length > 0 && hours.every((minutes) => minutes === 0);
  const unscoredFromIgn = facts.ignItems.length > 0 && suggestion.score === null;

  return suggestion.statusKey === BACKLOG_KEY && facts.entry.answers.playAnswer === null && (unscoredFromIgn || neverPlayed);
}

function isStatusQuestion(facts: EntryFacts): boolean {
  return (
    facts.ignItems.length === 0 &&
    facts.entry.answers.statusKey === null &&
    knownHours(facts.copies).some((minutes) => minutes > 0)
  );
}

function isFamilyQuestion(copies: readonly SuggestedCopy[]): boolean {
  return copies.some((copy) => copy.awaitingSteam || (copy.familySuggested && !copy.chosen));
}

function isEndlessQuestion(facts: EntryFacts, suggestion: ReviewSuggestion): boolean {
  return suggestion.statusKey === COMPLETED_KEY && facts.entry.multiplayerOnly && facts.entry.answers.endlessAnswer === null;
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

  return isStatusQuestion(facts) ? "status" : "ready";
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

/** Las respuestas de «Elegí un estado», en este orden; «Otro estado» abre la lista con todos (design.md §9). */
export const STATUS_ANSWER_KEYS = ["playing", COMPLETED_KEY, "abandoned", "tried"] as const;

function whichChoices(entry: ImportEntry): readonly ReviewChoice[] {
  const candidates = candidatesOf(entry).map((candidate) => ({ kind: "candidate" as const, candidate }));
  return [...candidates, { kind: "search" }, EXCLUDE];
}

function howLeftChoices(facts: EntryFacts): readonly ReviewChoice[] {
  const statuses = facts.ignStatusKeys.map((statusKey) => ({ kind: "status" as const, statusKey }));
  return [...statuses, OTHER_STATUS, EXCLUDE];
}

function familyChoices(copies: readonly SuggestedCopy[]): readonly ReviewChoice[] {
  if (copies.some((copy) => copy.awaitingSteam)) {
    return [];
  }

  return [{ kind: "copy_kind", copyKind: "family" }, { kind: "copy_kind", copyKind: "purchased" }, EXCLUDE];
}

/** Sin los estados del usuario se ofrecen los cuatro: al confirmar se crean los de fábrica. */
function statusChoices(context: ReviewContext): readonly ReviewChoice[] {
  const available = STATUS_ANSWER_KEYS.filter((statusKey) => context.statusKeys?.includes(statusKey) ?? true);
  return [...available.map((statusKey) => ({ kind: "status" as const, statusKey })), OTHER_STATUS, EXCLUDE];
}

const NOT_FOUND_CHOICES: readonly ReviewChoice[] = [{ kind: "search" }, { kind: "manual" }, EXCLUDE];
const ENDLESS_CHOICES: readonly ReviewChoice[] = [{ kind: "endless" }, { kind: "completed" }, EXCLUDE];
const PLAY_CHOICES: readonly ReviewChoice[] = [{ kind: "keep" }, { kind: "not_interested" }, EXCLUDE];

/** Las respuestas de cada grupo, ninguna marcada (design.md §9). */
function choicesOf(group: ReviewGroup, facts: EntryFacts, context: ReviewContext): readonly ReviewChoice[] {
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
      return ENDLESS_CHOICES;
    case "play":
      return PLAY_CHOICES;
    case "status":
      return statusChoices(context);
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

  return { entry, library: match, ignItems, copies, ignStatusKeys: ignStatusKeys(ignItems, copies), decided: isDecided(entry, copies) };
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
    choices: excluded ? [] : choicesOf(group, facts, context),
    isThisQuestion: group === "which" && isThisQuestion(entry),
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

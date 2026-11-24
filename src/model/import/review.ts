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

/** Las preguntas de a un juego: la respuesta no se puede adivinar, así que no hay opción marcada. */
const QUESTION_GROUPS: readonly ReviewGroup[] = ["which", "how_left", "not_found"];

export function isQuestionGroup(group: ReviewGroup): boolean {
  return QUESTION_GROUPS.includes(group);
}

/** Una opción de una sola elección (radio) en la fila de un juego. */
export type ReviewChoice =
  | Readonly<{ kind: "candidate"; candidate: ImportCandidate }>
  | Readonly<{ kind: "search" }>
  | Readonly<{ kind: "status"; statusKey: string }>
  | Readonly<{ kind: "other_status" }>
  | Readonly<{ kind: "manual" }>
  | Readonly<{ kind: "exclude" }>
  | Readonly<{ kind: "copy_kind"; copyKind: CopyKind }>
  | Readonly<{ kind: "other_kind" }>
  | Readonly<{ kind: "exclude_copy" }>
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
  /** La sugerencia marcada en los grupos de lote. `null` en las preguntas de a un juego y en «Listos para importar». */
  marked: ReviewChoice | null;
  /** Un solo candidato con otro nombre: la pregunta es «¿Es este juego?». */
  isThisQuestion: boolean;
  /** Entra cargado a mano, con el título que trajo. */
  manual: boolean;
  /** Las filas del juego: después de «Volver a revisar» dicen adónde volvió, aunque cambie de juego a revisar. */
  itemIds: readonly string[];
  suggestion: ReviewSuggestion;
  /** El usuario decidió algo: en «Listos para importar» se puede volver a revisar. */
  decided: boolean;
  /** El juego ya está en la biblioteca: solo suma copias. */
  libraryGameId: string | null;
  /** Una entrada que no es juego («Soundtrack», «[REDACTED]») que no encontró su base. */
  nonGame: boolean;
}>;

export type ReviewGroupView = Readonly<{ group: ReviewGroup; games: readonly ReviewGame[] }>;

export type ImportReview = Readonly<{
  groups: readonly ReviewGroupView[];
  /** Juegos que ya estaban en la biblioteca con todas sus copias. */
  upToDate: number;
  excluded: number;
  pendingCount: number;
  itemCount: number;
}>;

export type ReviewContext = Readonly<{ steamConnected: boolean }>;

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

/** Las preguntas de a un juego van primero: sin saber qué juego es, lo demás no se puede decidir. */
function questionOf(facts: EntryFacts): ReviewGroup | null {
  if (hasOpenState(facts.entry, "candidates")) {
    return "which";
  }

  if (needsStatusChoice(facts)) {
    return "how_left";
  }

  return hasOpenState(facts.entry, "not_found") ? "not_found" : null;
}

function groupOf(facts: EntryFacts, suggestion: ReviewSuggestion): ReviewGroup {
  const { decided } = facts;
  const question = decided ? null : questionOf(facts);

  if (question) {
    return question;
  }

  if (isFamilyQuestion(facts.copies) && !decided) {
    return "family";
  }

  if (decided || facts.library) {
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

function openCandidateItem(entry: ImportEntry): ImportItem | undefined {
  return entry.items.find((item) => item.matchState === "candidates" && item.chosenIgdbId === null);
}

function candidatesOf(entry: ImportEntry): readonly ImportCandidate[] {
  return openCandidateItem(entry)?.candidates ?? [];
}

/** Un solo candidato, y ninguno de los nombres con que llegó es el suyo. */
function isThisQuestion(entry: ImportEntry): boolean {
  const item = openCandidateItem(entry);

  if (item?.candidates.length !== 1) {
    return false;
  }

  const keys = new Set([item.title, ...item.altTitles].map(titleKey));
  return !keys.has(titleKey(item.candidates[0].title));
}

function isNonGameEntry(entry: ImportEntry): boolean {
  return entry.items.every((item) => detectNonGame(item.title) !== null);
}

type ChoiceSet = Readonly<{ choices: readonly ReviewChoice[]; marked: ReviewChoice | null }>;

const EXCLUDE: ReviewChoice = { kind: "exclude" };

function whichChoices(entry: ImportEntry): ChoiceSet {
  const candidates = candidatesOf(entry).map((candidate) => ({ kind: "candidate" as const, candidate }));
  return { choices: [...candidates, { kind: "search" }, EXCLUDE], marked: null };
}

function howLeftChoices(facts: EntryFacts): ChoiceSet {
  const statuses = facts.ignStatusKeys.map((statusKey) => ({ kind: "status" as const, statusKey }));
  return { choices: [...statuses, { kind: "other_status" }, EXCLUDE], marked: null };
}

function familyChoices(copies: readonly SuggestedCopy[]): ChoiceSet {
  if (copies.some((copy) => copy.awaitingSteam)) {
    return { choices: [], marked: null };
  }

  const choices: readonly ReviewChoice[] = [
    { kind: "copy_kind", copyKind: "family" },
    { kind: "copy_kind", copyKind: "purchased" },
    { kind: "other_kind" } as const,
    { kind: "exclude_copy" } as const,
  ];
  return { choices, marked: choices[0] };
}

const NOT_FOUND_CHOICES: ChoiceSet = { choices: [{ kind: "search" }, { kind: "manual" }, EXCLUDE], marked: null };

function choicesOf(group: ReviewGroup, facts: EntryFacts): ChoiceSet {
  switch (group) {
    case "which":
      return whichChoices(facts.entry);
    case "how_left":
      return howLeftChoices(facts);
    case "not_found":
      return NOT_FOUND_CHOICES;
    case "family":
      return familyChoices(facts.copies);
    case "endless": {
      const choices = [{ kind: "endless" } as const, { kind: "completed" } as const];
      return { choices, marked: choices[0] };
    }
    case "play": {
      const choices = [{ kind: "keep" } as const, { kind: "not_interested" } as const, EXCLUDE];
      return { choices, marked: choices[0] };
    }
    case "status":
      return { choices: [], marked: { kind: "status", statusKey: BACKLOG_KEY } };
    case "ready":
      return { choices: [], marked: null };
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

/** `null` si no hay nada que revisar: un juego excluido o que ya estaba con todas sus copias. */
export function reviewGame(entry: ImportEntry, library: readonly LibraryMatch[], context: ReviewContext): ReviewGame | null {
  const facts = factsOf(entry, library, context);

  if (entry.answers.excluded || (facts.library && keptCopies(facts.copies).length === 0)) {
    return null;
  }

  const suggestion = suggestionOf(facts);
  const group = groupOf(facts, suggestion);
  const { choices, marked } = choicesOf(group, facts);
  const firstItem = entry.items[0];

  return {
    entryId: entry.id,
    title: titleOf(entry),
    year: entry.catalog?.year ?? firstItem.year,
    coverUrl: entry.catalog?.coverUrl ?? null,
    estimatedHours: entry.catalog?.estimatedHours ?? suggestion.hltbHours,
    origins: entry.items.filter((item) => item.matchState !== "absorbed").map(originOf),
    group,
    choices,
    marked,
    isThisQuestion: group === "which" && isThisQuestion(entry),
    manual: entry.answers.manualTitle !== null,
    itemIds: entry.items.map((item) => item.id),
    suggestion,
    decided: facts.decided,
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
  let excluded = 0;

  for (const entry of open.entries) {
    const game = reviewGame(entry, open.library, context);

    if (game) {
      games.push(game);
    } else if (entry.answers.excluded) {
      excluded += 1;
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
    excluded,
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

  return {
    games: ready.filter((game) => game.libraryGameId === null).length,
    copies: ready.reduce((total, game) => total + keptCopies(game.suggestion.copies).length, 0),
  };
}

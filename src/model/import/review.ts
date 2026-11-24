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
import { normalizeText } from "@/model/game/normalize-text";
import { BACKLOG_KEY } from "@/model/status/status";

const COMPLETED_KEY = "completed";
export const PLAYED_KEY = "played";

/** En este orden: cada juego está en el primero que le toca (design.md §9). */
export const REVIEW_GROUPS = ["review", "not_found", "family", "endless", "play", "status", "ready"] as const;

export type ReviewGroup = (typeof REVIEW_GROUPS)[number];

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

/** De dónde vino cada fila, para mostrar «IGN · Beat · 9» o «Steam · 48 h». */
export type ReviewOrigin = Readonly<{
  source: ImportSource;
  storeName: string | null;
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
  /** La opción marcada: la sugerencia o lo que el usuario eligió. `null` si el grupo no ofrece opciones. */
  marked: ReviewChoice | null;
  suggestion: ReviewSuggestion;
  /** El usuario decidió algo: en «Listos» se puede volver a revisar. */
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

function hasChosenCandidate(entry: ImportEntry): boolean {
  return entry.items.some((item) => item.matchState === "matched" && item.candidates.length > 0);
}

function isDecided(entry: ImportEntry, copies: readonly SuggestedCopy[]): boolean {
  const { statusKey, endlessAnswer, playAnswer, manualTitle } = entry.answers;
  const answered = [statusKey, endlessAnswer, playAnswer, manualTitle].some((answer) => answer !== null);

  return answered || copies.some((copy) => copy.chosen) || hasChosenCandidate(entry);
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

function hasState(entry: ImportEntry, state: ImportItem["matchState"]): boolean {
  return entry.items.some((item) => item.matchState === state);
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

/** «Para revisar» y «No lo encontré» van primero: sin saber qué juego es, lo demás no se puede decidir. */
function groupOf(facts: EntryFacts, suggestion: ReviewSuggestion): ReviewGroup {
  const { entry, decided } = facts;

  if (!decided && (hasState(entry, "candidates") || needsStatusChoice(facts))) {
    return "review";
  }

  if (!decided && hasState(entry, "not_found")) {
    return "not_found";
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

function candidatesOf(entry: ImportEntry): readonly ImportCandidate[] {
  return entry.items.find((item) => item.matchState === "candidates")?.candidates ?? [];
}

function isNonGameEntry(entry: ImportEntry): boolean {
  return entry.items.every((item) => detectNonGame(item.title) !== null);
}

type ChoiceSet = Readonly<{ choices: readonly ReviewChoice[]; marked: ReviewChoice | null }>;

function reviewChoices(facts: EntryFacts): ChoiceSet {
  const candidates = candidatesOf(facts.entry);

  if (candidates.length > 0) {
    const choices = [...candidates.map((candidate) => ({ kind: "candidate" as const, candidate })), { kind: "search" } as const];
    return { choices, marked: choices[0] };
  }

  const choices = [...facts.ignStatusKeys.map((statusKey) => ({ kind: "status" as const, statusKey })), { kind: "other_status" } as const];
  return { choices, marked: choices[0] };
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

function notFoundChoices(entry: ImportEntry): ChoiceSet {
  const choices = [{ kind: "manual" } as const, { kind: "exclude" } as const];
  return { choices, marked: isNonGameEntry(entry) ? choices[1] : choices[0] };
}

function choicesOf(group: ReviewGroup, facts: EntryFacts): ChoiceSet {
  switch (group) {
    case "review":
      return reviewChoices(facts);
    case "not_found":
      return notFoundChoices(facts.entry);
    case "family":
      return familyChoices(facts.copies);
    case "endless": {
      const choices = [{ kind: "endless" } as const, { kind: "completed" } as const];
      return { choices, marked: choices[0] };
    }
    case "play": {
      const choices = [{ kind: "keep" } as const, { kind: "not_interested" } as const, { kind: "exclude" } as const];
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
    suggestion,
    decided: facts.decided,
    libraryGameId: facts.library?.libraryGameId ?? null,
    nonGame: hasState(entry, "not_found") && isNonGameEntry(entry),
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

/** «En «Listos»: 237 juegos y 252 copias.» */
export function countReady(review: ImportReview): ReadyCounts {
  const ready = gamesInGroup(review, "ready");

  return {
    games: ready.filter((game) => game.libraryGameId === null).length,
    copies: ready.reduce((total, game) => total + keptCopies(game.suggestion.copies).length, 0),
  };
}

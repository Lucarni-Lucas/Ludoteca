import { type EntryAnswers, type ImportEntry, type ImportItem, NO_ANSWERS, type OpenReview } from "@/model/import/import-entry";
import type { StatusRef } from "@/model/import/review";
import { DEFAULT_STATUSES, type Status } from "@/model/status/status";
import type { Store } from "@/model/store/store";

export const STEAM: Store = { id: "store-steam", name: "Steam", slug: "steam" };
export const EPIC: Store = { id: "store-epic", name: "Epic Games", slug: "epic-games" };
export const GOG: Store = { id: "store-gog", name: "GOG", slug: "gog" };

/** Los estados de fábrica con el `system_key` como id, para nombrarlos en los tests. */
export const STATUSES: readonly Status[] = DEFAULT_STATUSES.map((value) => ({ ...value, id: value.systemKey ?? value.name }));

export function statusRef(systemKey: string): StatusRef {
  const status = STATUSES.find((value) => value.systemKey === systemKey);

  if (!status) {
    throw new Error(`Estado de prueba desconocido: ${systemKey}`);
  }

  return { id: status.id, name: status.name, systemKey: status.systemKey };
}

let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

export function item(overrides: Partial<ImportItem> = {}): ImportItem {
  return {
    id: nextId("item"),
    source: "ign",
    sourceKey: nextId("key"),
    title: "Juego",
    altTitles: [],
    year: 2020,
    store: null,
    storeGameId: null,
    playtimeMinutes: null,
    ignStatuses: [],
    ignScore: null,
    hltbMainHours: null,
    steamAppId: null,
    matchState: "matched",
    candidates: [],
    chosenIgdbId: null,
    entryId: null,
    copyKind: null,
    excluded: false,
    ...overrides,
  };
}

export function ignItem(title: string, overrides: Partial<ImportItem> = {}): ImportItem {
  return item({ title, source: "ign", ...overrides });
}

export function steamItem(title: string, appId: string, minutes: number | null, overrides: Partial<ImportItem> = {}) {
  return item({ title, source: "steam", sourceKey: appId, store: STEAM, storeGameId: appId, playtimeMinutes: minutes, ...overrides });
}

export function playniteItem(title: string, store: Store, storeGameId: string, overrides: Partial<ImportItem> = {}) {
  const playtimeMinutes = store.slug === "steam" ? null : 0;
  return item({
    title,
    source: "playnite",
    sourceKey: `${store.slug}:${storeGameId}`,
    store,
    storeGameId,
    playtimeMinutes,
    ...overrides,
  });
}

type EntryOptions = Partial<Omit<ImportEntry, "items" | "answers">> & Readonly<{ answers?: Partial<EntryAnswers> }>;

export function entry(title: string, items: readonly ImportItem[], options: EntryOptions = {}): ImportEntry {
  const id = options.id ?? nextId("entry");
  const { answers, ...rest } = options;

  return {
    id,
    igdbId: 1,
    catalogGameId: `catalog-${id}`,
    catalog: { title, year: 2020, coverUrl: null, estimatedHours: null, endless: false },
    multiplayerOnly: false,
    libraryGameId: null,
    ...rest,
    answers: { ...NO_ANSWERS, ...answers },
    items: items.map((value) => ({ ...value, entryId: id })),
  };
}

export function openReview(entries: readonly ImportEntry[], library: OpenReview["library"] = []): OpenReview {
  return { entries, library, pendingCount: 0, itemCount: entries.reduce((total, value) => total + value.items.length, 0) };
}

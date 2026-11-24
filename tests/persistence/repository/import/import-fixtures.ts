import type { MatchedGame, NewImportItem } from "@/model/import/import-entry";

import { igdbData } from "../game/game-fixtures";

export function newItem(sourceKey: string, overrides: Partial<NewImportItem> = {}): NewImportItem {
  return {
    source: "ign",
    sourceKey,
    title: `Juego ${sourceKey}`,
    altTitles: [],
    year: 2020,
    storeId: null,
    storeGameId: null,
    playtimeMinutes: null,
    ignStatuses: ["backlog"],
    ignScore: null,
    hltbMainHours: null,
    steamAppId: null,
    ...overrides,
  };
}

export function matchedGame(igdbId: number, title: string, overrides: Partial<MatchedGame> = {}): MatchedGame {
  return { ...igdbData(igdbId, title), multiplayerOnly: false, ...overrides };
}

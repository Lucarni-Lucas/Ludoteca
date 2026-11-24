import type { ImportRow } from "@/model/import/import-row";
import { storeSlug } from "@/model/store/store";

import type { PlayniteGameDto } from "./dto/playnite-dto";

const SECONDS_PER_MINUTE = 60;
const STEAM_SOURCE = "Steam";
const LEADING_YEAR = /^(\d{4})/;

/** Los nombres de Playnite que no coinciden con los de las tiendas conocidas; el resto pasa tal cual. */
const STORE_NAMES: ReadonlyMap<string, string> = new Map([
  ["Epic", "Epic Games"],
  ["Steam", "Steam"],
  ["GOG", "GOG"],
]);

export type PlayniteGameWithStore = PlayniteGameDto & Readonly<{ sourceName: string; providerGameId: string }>;

export function hasStore(game: PlayniteGameDto): game is PlayniteGameWithStore {
  return Boolean(game.sourceName?.trim()) && Boolean(game.providerGameId?.trim());
}

function toYear(releaseDate: string | null | undefined): number | null {
  const match = releaseDate ? LEADING_YEAR.exec(releaseDate) : null;
  return match ? Number(match[1]) : null;
}

/** Playnite sin sesión en Steam siempre dice 0: 0 haría creer que nunca lo abriste, así que queda vacío. */
function toPlaytime(game: PlayniteGameWithStore): number | null {
  if (game.sourceName === STEAM_SOURCE || game.playtimeSeconds == null) {
    return null;
  }

  return Math.round(game.playtimeSeconds / SECONDS_PER_MINUTE);
}

export function toImportRow(game: PlayniteGameWithStore): ImportRow {
  const storeName = STORE_NAMES.get(game.sourceName) ?? game.sourceName.trim();
  const storeGameId = game.providerGameId.trim();

  return {
    source: "playnite",
    sourceKey: `${storeSlug(storeName)}:${storeGameId}`,
    title: game.name,
    altTitles: [],
    year: toYear(game.releaseDate),
    storeName,
    storeGameId,
    playtimeMinutes: toPlaytime(game),
    ignStatuses: [],
    ignScore: null,
    hltbMainHours: null,
    steamAppId: null,
  };
}

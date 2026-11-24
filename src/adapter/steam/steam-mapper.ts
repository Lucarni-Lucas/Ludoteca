import type { ImportRow } from "@/model/import/import-row";

import type { OwnedGameDto } from "./dto/steam-dto";

const STEAM_STORE_NAME = "Steam";

/** Cada juego de la cuenta es una fila de Steam con sus horas; el appid es la clave y el ID en la tienda. */
export function toImportRow(game: OwnedGameDto): ImportRow {
  const appId = String(game.appid);

  return {
    source: "steam",
    sourceKey: appId,
    // Con include_appinfo siempre llega el nombre; si faltara, el appid deja la fila reconocible.
    title: game.name ?? `Steam ${appId}`,
    altTitles: [],
    year: null,
    storeName: STEAM_STORE_NAME,
    storeGameId: appId,
    playtimeMinutes: game.playtime_forever ?? null,
    ignStatuses: [],
    ignScore: null,
    hltbMainHours: null,
    steamAppId: appId,
  };
}

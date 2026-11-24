// Reemplaza a la Steam Web API en los e2e, con la forma real de sus respuestas (04 tasks.md 4.3).
import { createServer, type ServerResponse } from "node:http";

import {
  STEAM_API_KEY,
  STEAM_PORT,
  STEAM_PUBLIC_ID,
  STEAM_PUBLIC_VANITY,
  STEAM_URL,
} from "./constants.ts";

const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
// `success` de ResolveVanityURL: 1 si encontró el nombre y 42 («No match») si no.
const VANITY_FOUND = 1;
const VANITY_MISSING = 42;

/** Los juegos de la cuenta pública: Celeste y 8BitMMO también llegan de IGN o Playnite, Hollow Knight no. */
const OWNED_GAMES = [
  { appid: 504230, name: "Celeste", playtime_forever: 600, img_icon_url: "a1", has_community_visible_stats: true },
  { appid: 250420, name: "8BitMMO", playtime_forever: 0, img_icon_url: "b2" },
  { appid: 367520, name: "Hollow Knight", playtime_forever: 2880, img_icon_url: "c3" },
  { appid: 945360, name: "Among Us", playtime_forever: 300, img_icon_url: "d4" },
];

function sendJson(response: ServerResponse, body: unknown, status = 200): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

/** Un perfil con los detalles de juego privados (STEAM_PRIVATE_ID) responde sin game_count, como cualquier otro. */
function ownedGames(steamId: string | null) {
  return steamId === STEAM_PUBLIC_ID ? { response: { game_count: OWNED_GAMES.length, games: OWNED_GAMES } } : { response: {} };
}

function resolveVanity(name: string | null) {
  return name === STEAM_PUBLIC_VANITY
    ? { response: { steamid: STEAM_PUBLIC_ID, success: VANITY_FOUND } }
    : { response: { success: VANITY_MISSING, message: "No match" } };
}

createServer((request, response) => {
  const url = new URL(request.url ?? "/", STEAM_URL);

  if (url.searchParams.get("key") !== STEAM_API_KEY) {
    sendJson(response, {}, HTTP_FORBIDDEN);
    return;
  }

  switch (url.pathname) {
    case "/IPlayerService/GetOwnedGames/v1/":
      sendJson(response, ownedGames(url.searchParams.get("steamid")));
      return;
    case "/ISteamUser/ResolveVanityURL/v1/":
      sendJson(response, resolveVanity(url.searchParams.get("vanityurl")));
      return;
    default:
      sendJson(response, { message: url.pathname }, HTTP_NOT_FOUND);
  }
}).listen(STEAM_PORT, "127.0.0.1");

// Reemplaza a Twitch y a IGDB en los e2e: la app corre sin cambios y sin credenciales reales.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { IGDB_PORT, IGDB_URL } from "./constants.ts";

type FakeGame = Readonly<{
  id: number;
  name: string;
  year: number;
  coverImageId?: string;
  versionParent?: number;
  developer?: string;
  normallySeconds?: number;
  /** Los slugs de `game_modes`; sin modos, como muchos juegos de IGDB. */
  modes?: readonly string[];
  steamAppId?: string;
}>;

const SECONDS_PER_HOUR = 3600;
const MILLISECONDS_PER_SECOND = 1000;
const TOKEN_LIFETIME_SECONDS = 5_000_000;

const GAMES: readonly FakeGame[] = [
  { id: 1, name: "Hollow Knight", year: 2017, developer: "Team Cherry", normallySeconds: 27 * SECONDS_PER_HOUR },
  { id: 2, name: "Hollow Knight: Silksong", year: 2025, developer: "Team Cherry" },
  { id: 3, name: "Hades", year: 2020, developer: "Supergiant Games", normallySeconds: 22 * SECONDS_PER_HOUR },
  { id: 4, name: "Sid Meier's Civilization VI", year: 2016, developer: "Firaxis Games" },
  { id: 5, name: "Sid Meier's Civilization VI: Platinum Edition", year: 2021, versionParent: 4 },
  { id: 6, name: "Outer Wilds", year: 2019, developer: "Mobius Digital", normallySeconds: 17 * SECONDS_PER_HOUR },
  { id: 7, name: "Frostpunk", year: 2018, developer: "11 bit studios", normallySeconds: 12 * SECONDS_PER_HOUR },
  { id: 8, name: "Disco Elysium", year: 2019, developer: "ZA/UM", normallySeconds: 22 * SECONDS_PER_HOUR },
  { id: 9, name: "8BitMMO", year: 2013, developer: "Archive Entertainment", steamAppId: "250420" },
  // Los de las muestras de importación (tests/adapter/ign y tests/adapter/playnite).
  { id: 10, name: "20 Minutes Till Dawn", year: 2022, steamAppId: "1966900", normallySeconds: 4 * SECONDS_PER_HOUR },
  { id: 11, name: "60 Seconds!", year: 2015, steamAppId: "368360" },
  { id: 12, name: "Among Us", year: 2018, steamAppId: "945360", modes: ["multiplayer", "co-operative"] },
  { id: 13, name: "Overwatch", year: 2016, modes: ["multiplayer"] },
  { id: 14, name: "Overwatch 2", year: 2022, modes: ["multiplayer"] },
  { id: 15, name: "Celeste", year: 2018, steamAppId: "504230", modes: ["single-player"], normallySeconds: 8 * SECONDS_PER_HOUR },
  { id: 16, name: "Portal 2", year: 2011, steamAppId: "620", modes: ["single-player", "co-operative"] },
  { id: 17, name: "Grand Theft Auto V", year: 2013, modes: ["single-player", "multiplayer"] },
  { id: 18, name: "112 Operator", year: 2022, modes: ["single-player"] },
  { id: 19, name: "Rocket League", year: 2015, modes: ["multiplayer"] },
  { id: 20, name: "Barony", year: 2015, modes: ["single-player", "co-operative"] },
  // Los casos que aparecieron con los datos reales (04 tasks.md 8.10): varios con el mismo nombre, uno solo
  // con otro nombre y el mismo nombre con otro año.
  { id: 21, name: "Crash Bandicoot", year: 1996, modes: ["single-player"] },
  { id: 22, name: "Crash Bandicoot", year: 2017, modes: ["single-player"] },
  { id: 23, name: "Crash Bandicoot: The Wrath of Cortex", year: 2001, modes: ["single-player"] },
  { id: 24, name: "Castlevania Anniversary Collection - Ultimate Edition", year: 2019, modes: ["single-player"] },
  { id: 25, name: "20XX", year: 2017, modes: ["single-player", "co-operative"] },
  // Los de la segunda prueba con datos reales (04 tasks.md 9.6): dos con el mismo nombre, el juego sin la
  // edición y un nombre entre corchetes que es un juego de verdad.
  { id: 26, name: "Fortnite", year: 2017, modes: ["single-player", "multiplayer"] },
  { id: 27, name: "Fortnite", year: 2018, modes: ["multiplayer", "battle-royale"] },
  { id: 28, name: "Styx: Shards of Darkness", year: 2017, modes: ["single-player"] },
  { id: 29, name: "[REDACTED]", year: 2024, modes: ["single-player"] },
];

// La fuente de Steam en external_games, verificada contra IGDB real (04 design.md §7).
const STEAM_SOURCE = 1;
const STEAM_APP_IDS = new Map([
  ["367520", 1],
  ...GAMES.flatMap((game) => (game.steamAppId ? [[game.steamAppId, game.id] as const] : [])),
]);

function toGameDto(game: FakeGame) {
  return {
    id: game.id,
    name: game.name,
    first_release_date: Date.UTC(game.year, 5, 15) / MILLISECONDS_PER_SECOND,
    url: `https://www.igdb.com/games/${game.id}`,
    version_parent: game.versionParent,
    involved_companies: game.developer ? [{ developer: true, company: { name: game.developer } }] : [],
    game_modes: game.modes?.map((slug) => ({ slug })),
  };
}

/** Los ids de `where id = 3;` o `where id = (3,4);`, como los manda el adapter. */
function idsIn(body: string, field: string): readonly number[] {
  const list = new RegExp(String.raw`where ${field} = \(([\d,]+)\)`).exec(body)?.[1];
  const single = new RegExp(String.raw`where ${field} = (\d+);`).exec(body)?.[1];
  return (list ?? single ?? "").split(",").filter(Boolean).map(Number);
}

function matchGames(body: string): readonly FakeGame[] {
  const search = /search "([^"]*)";/.exec(body)?.[1]?.toLowerCase();

  if (search !== undefined) {
    return GAMES.filter((game) => game.name.toLowerCase().includes(search));
  }

  // Con textos cortos el adapter busca por el comienzo del nombre, como IGDB con `name ~ "hol"*`.
  const prefix = /where name ~ "([^"]*)"\*/.exec(body)?.[1]?.toLowerCase();

  if (prefix !== undefined) {
    return GAMES.filter((game) => game.name.toLowerCase().startsWith(prefix));
  }

  // La importación busca primero el nombre exacto, sin distinguir mayúsculas: `where name ~ "Hades" & …`.
  const exact = /where name ~ "([^"]*)" &/.exec(body)?.[1]?.toLowerCase();

  if (exact !== undefined) {
    return GAMES.filter((game) => game.name.toLowerCase() === exact);
  }

  const ids = idsIn(body, "id");
  return GAMES.filter((game) => ids.includes(game.id));
}

function timesToBeat(body: string) {
  const ids = idsIn(body, "game_id");

  return GAMES.filter((game) => ids.includes(game.id) && game.normallySeconds !== undefined).map((game) => ({
    game_id: game.id,
    normally: game.normallySeconds,
  }));
}

function externalGames(body: string) {
  const source = Number(/external_game_source = (\d+)/.exec(body)?.[1]);
  const uids = [...(/uid = \(([^)]*)\)/.exec(body)?.[1] ?? "").matchAll(/"([^"]*)"/g)].map(([, uid]) => uid);

  return source === STEAM_SOURCE
    ? uids.flatMap((uid) => {
        const game = STEAM_APP_IDS.get(uid);
        return game === undefined ? [] : [{ uid, game }];
      })
    : [];
}

/** Cada `query games "0" { … };` responde como si fuera un pedido a /games. */
function multiquery(body: string) {
  return [...body.matchAll(/query games "([^"]+)" \{([^}]*)\};/g)].map(([, name, query]) => ({
    name,
    result: matchGames(query).map(toGameDto),
  }));
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(response: ServerResponse, body: unknown, status = 200): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const { pathname } = new URL(request.url ?? "/", IGDB_URL);

  switch (pathname) {
    case "/token":
      return sendJson(response, { access_token: "token-e2e", expires_in: TOKEN_LIFETIME_SECONDS, token_type: "bearer" });
    case "/v4/games":
      return sendJson(response, matchGames(await readBody(request)).map(toGameDto));
    case "/v4/game_time_to_beats":
      return sendJson(response, timesToBeat(await readBody(request)));
    case "/v4/external_games":
      return sendJson(response, externalGames(await readBody(request)));
    case "/v4/multiquery":
      return sendJson(response, multiquery(await readBody(request)));
    default:
      return sendJson(response, { message: pathname }, 404);
  }
}

createServer((request, response) => {
  route(request, response).catch((error: unknown) => {
    sendJson(response, { message: String(error) }, 500);
  });
}).listen(IGDB_PORT, "127.0.0.1");

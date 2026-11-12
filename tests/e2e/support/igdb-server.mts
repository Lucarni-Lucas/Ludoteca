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
  { id: 9, name: "8BitMMO", year: 2013, developer: "Archive Entertainment" },
];

function toGameDto(game: FakeGame) {
  return {
    id: game.id,
    name: game.name,
    first_release_date: Date.UTC(game.year, 5, 15) / MILLISECONDS_PER_SECOND,
    url: `https://www.igdb.com/games/${game.id}`,
    version_parent: game.versionParent,
    involved_companies: game.developer ? [{ developer: true, company: { name: game.developer } }] : [],
  };
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

  const id = Number(/where id = (\d+);/.exec(body)?.[1]);
  return GAMES.filter((game) => game.id === id);
}

function timesToBeat(body: string) {
  const id = Number(/where game_id = (\d+);/.exec(body)?.[1]);
  const game = GAMES.find((candidate) => candidate.id === id);

  return game?.normallySeconds === undefined ? [] : [{ normally: game.normallySeconds }];
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
    default:
      return sendJson(response, { message: pathname }, 404);
  }
}

createServer((request, response) => {
  route(request, response).catch((error: unknown) => {
    sendJson(response, { message: String(error) }, 500);
  });
}).listen(IGDB_PORT, "127.0.0.1");

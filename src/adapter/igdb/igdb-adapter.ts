import type { IgdbEnv } from "@/config/env";
import type { IgdbGameData, IgdbSearchResult } from "@/model/game/catalog";
import type { MatchedGame } from "@/model/import/import-entry";
import { logger } from "@/shared/logger";
import { chunk } from "@/shared/chunk";

import type {
  IgdbBatchGameDto,
  IgdbBatchTimeToBeatDto,
  IgdbExternalGameDto,
  IgdbGameDto,
  IgdbMultiqueryDto,
  IgdbSearchGameDto,
  IgdbTimeToBeatDto,
} from "./dto/igdb-dto";
import { IgdbRateLimitError, IgdbTimeoutError, IgdbUnavailableError } from "./errors";
import { toGameData, toMatchedGame, toSearchResult } from "./igdb-mapper";
import { createIgdbTokenProvider, type IgdbTokenStore } from "./igdb-token";

const DEFAULT_TIMEOUT_MS = 8000;
const HTTP_UNAUTHORIZED = 401;
const HTTP_TOO_MANY_REQUESTS = 429;
const SEARCH_LIMIT = 10;
// Juegos que se pueden tener: principal, expansión independiente, remake, remaster, expandido y port.
const OWNABLE_GAME_TYPES = "(0,4,8,9,10,11)";
// Una edición («Platinum Edition») viene como bundle, pero tiene version_parent: se guarda como su juego base.
const SEARCH_FILTER = `(game_type = ${OWNABLE_GAME_TYPES} | version_parent != null)`;
/**
 * `search` de IGDB busca palabras enteras: con «hol» no encuentra «Hollow Knight» (verificado contra IGDB real).
 * Hasta este largo se busca por el comienzo del nombre, ordenado por popularidad.
 */
const MAX_PREFIX_SEARCH_LENGTH = 3;
const SEARCH_FIELDS = "fields name,first_release_date,cover.image_id,version_parent;";

const GAME_FIELDS = [
  "name",
  "first_release_date",
  "cover.image_id",
  "url",
  "version_parent",
  "involved_companies.developer",
  "involved_companies.company.name",
].join(",");

// IGDB acepta 4 pedidos por segundo: entre uno y otro, al menos esto (design.md §7).
export const MIN_REQUEST_INTERVAL_MS = 250;
const MULTIQUERY_SIZE = 10;
// El máximo de resultados por consulta de IGDB.
const MAX_RESULTS = 500;
const BATCH_GAME_FIELDS = `${GAME_FIELDS},game_modes.slug`;

/** Los ids de `external_game_sources` verificados contra IGDB real (design.md §7). */
const EXTERNAL_SOURCES = { steam: 1, gog: 5 } as const;

export type ExternalStore = keyof typeof EXTERNAL_SOURCES;

export type IgdbAdapter = Readonly<{
  search(text: string, signal?: AbortSignal): Promise<readonly IgdbSearchResult[]>;
  getGame(igdbId: number): Promise<IgdbGameData | null>;
  /** El juego de IGDB de cada ID en la tienda que IGDB conoce. */
  findByExternalIds(store: ExternalStore, uids: readonly string[]): Promise<ReadonlyMap<string, number>>;
  /** Los resultados de cada título: primero por nombre exacto, de a 10, y si no, con `search`. */
  searchMany(titles: readonly string[]): Promise<ReadonlyMap<string, readonly IgdbSearchResult[]>>;
  /** Los datos de cada juego pedido; una edición trae los de su juego base. */
  getGamesData(igdbIds: readonly number[]): Promise<ReadonlyMap<number, MatchedGame>>;
}>;

/** El reloj y la espera de la separación entre pedidos; los tests los reemplazan. */
export type RequestPacing = Readonly<{
  intervalMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}>;

const DEFAULT_PACING: RequestPacing = {
  intervalMs: MIN_REQUEST_INTERVAL_MS,
  now: () => performance.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

type IgdbAdapterDependencies = Readonly<{
  getEnv: () => IgdbEnv;
  tokenStore: IgdbTokenStore;
  timeoutMs?: number;
  now?: () => number;
  pacing?: RequestPacing;
}>;

function quoted(values: readonly string[]): string {
  return values.map((value) => `"${escapeSearchText(value)}"`).join(",");
}

function exactNameQuery(label: number, title: string): string {
  return `query games "${label}" { ${SEARCH_FIELDS} where name ~ "${escapeSearchText(title)}" & ${SEARCH_FILTER}; limit ${SEARCH_LIMIT}; };`;
}

/** Reserva el próximo turno antes de esperar: dos pedidos a la vez no salen juntos. */
function createPacer({ intervalMs, now, sleep }: RequestPacing) {
  let nextSlot = 0;

  return async function waitTurn(): Promise<void> {
    const current = now();
    const slot = Math.max(current, nextSlot);
    nextSlot = slot + intervalMs;

    if (slot > current) {
      await sleep(slot - current);
    }
  };
}

/** Las comillas del texto no pueden cerrar la consulta de Apicalypse. */
function escapeSearchText(text: string): string {
  return text.replaceAll("\\", String.raw`\\`).replaceAll('"', String.raw`\"`);
}

function searchBody(text: string): string {
  const escaped = escapeSearchText(text);
  const limit = `limit ${SEARCH_LIMIT};`;

  if (Array.from(text).length <= MAX_PREFIX_SEARCH_LENGTH) {
    return [
      SEARCH_FIELDS,
      `where name ~ "${escaped}"* & ${SEARCH_FILTER};`,
      "sort total_rating_count desc;",
      limit,
    ].join(" ");
  }

  return [`search "${escaped}";`, SEARCH_FIELDS, `where ${SEARCH_FILTER};`, limit].join(" ");
}

function toProviderError(error: unknown): Error {
  logger.warn("Falló el pedido a IGDB", { error });
  return error instanceof Error && error.name === "TimeoutError" ? new IgdbTimeoutError() : new IgdbUnavailableError();
}

function assertOk(response: Response): void {
  if (response.status === HTTP_TOO_MANY_REQUESTS) {
    throw new IgdbRateLimitError();
  }

  if (!response.ok) {
    throw new IgdbUnavailableError();
  }
}

export function createIgdbAdapter({
  getEnv,
  tokenStore,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = Date.now,
  pacing = DEFAULT_PACING,
}: IgdbAdapterDependencies): IgdbAdapter {
  const waitTurn = createPacer(pacing);
  // Las credenciales se leen al primer pedido: sin ellas, la biblioteca sigue andando.
  const tokens = createIgdbTokenProvider({
    tokenUrl: () => getEnv().TWITCH_TOKEN_URL,
    clientId: () => getEnv().TWITCH_CLIENT_ID,
    clientSecret: () => getEnv().TWITCH_CLIENT_SECRET,
    tokenStore,
    now,
  });

  async function send(endpoint: string, body: string, token: string, signal?: AbortSignal): Promise<Response> {
    const { IGDB_API_URL, TWITCH_CLIENT_ID } = getEnv();
    await waitTurn();
    const timeout = AbortSignal.timeout(timeoutMs);

    return fetch(`${IGDB_API_URL}/${endpoint}`, {
      method: "POST",
      headers: { "Client-ID": TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` },
      body,
      signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    });
  }

  /** Con un 401 el token dejó de valer antes de tiempo: se renueva y se reintenta una sola vez. */
  async function sendWithFreshToken(endpoint: string, body: string, signal?: AbortSignal): Promise<Response> {
    const response = await send(endpoint, body, await tokens.getToken(), signal);

    return response.status === HTTP_UNAUTHORIZED
      ? send(endpoint, body, await tokens.renewToken(), signal)
      : response;
  }

  async function query<T>(endpoint: string, body: string, signal?: AbortSignal): Promise<readonly T[]> {
    let response: Response;

    try {
      response = await sendWithFreshToken(endpoint, body, signal);
    } catch (error) {
      throw error instanceof IgdbUnavailableError ? error : toProviderError(error);
    }

    assertOk(response);

    try {
      return (await response.json()) as readonly T[];
    } catch (error) {
      throw toProviderError(error);
    }
  }

  async function fetchGame(igdbId: number): Promise<IgdbGameDto | undefined> {
    const games = await query<IgdbGameDto>("games", `fields ${GAME_FIELDS}; where id = ${igdbId}; limit 1;`);
    return games[0];
  }

  async function fetchTimeToBeat(igdbId: number): Promise<IgdbTimeToBeatDto | undefined> {
    const times = await query<IgdbTimeToBeatDto>(
      "game_time_to_beats",
      `fields normally; where game_id = ${igdbId}; limit 1;`,
    );
    return times[0];
  }

  async function searchExactNames(titles: readonly string[]): Promise<Map<string, readonly IgdbSearchResult[]>> {
    const found = new Map<string, readonly IgdbSearchResult[]>();

    for (const group of chunk(titles, MULTIQUERY_SIZE)) {
      const body = group.map((title, index) => exactNameQuery(index, title)).join(" ");
      const answers = await query<IgdbMultiqueryDto<IgdbSearchGameDto>>("multiquery", body);

      for (const answer of answers) {
        const title = group[Number(answer.name)];
        const results = (answer.result ?? []).map(toSearchResult);

        if (title !== undefined && results.length > 0) {
          found.set(title, results);
        }
      }
    }

    return found;
  }

  async function fetchBatchGames(igdbIds: readonly number[]): Promise<readonly IgdbBatchGameDto[]> {
    const games: IgdbBatchGameDto[] = [];

    for (const ids of chunk(igdbIds, MAX_RESULTS)) {
      const body = `fields ${BATCH_GAME_FIELDS}; where id = (${ids.join(",")}); limit ${MAX_RESULTS};`;
      games.push(...(await query<IgdbBatchGameDto>("games", body)));
    }

    return games;
  }

  async function fetchTimesToBeat(igdbIds: readonly number[]): Promise<ReadonlyMap<number, IgdbTimeToBeatDto>> {
    const times = new Map<number, IgdbTimeToBeatDto>();

    for (const ids of chunk(igdbIds, MAX_RESULTS)) {
      const body = `fields game_id,normally; where game_id = (${ids.join(",")}); limit ${MAX_RESULTS};`;

      for (const time of await query<IgdbBatchTimeToBeatDto>("game_time_to_beats", body)) {
        times.set(time.game_id, time);
      }
    }

    return times;
  }

  return {
    async findByExternalIds(store, uids) {
      const found = new Map<string, number>();

      for (const group of chunk([...new Set(uids)], MAX_RESULTS)) {
        const body = `fields uid,game; where external_game_source = ${EXTERNAL_SOURCES[store]} & uid = (${quoted(group)}); limit ${MAX_RESULTS};`;

        for (const external of await query<IgdbExternalGameDto>("external_games", body)) {
          if (external.game !== undefined && !found.has(external.uid)) {
            found.set(external.uid, external.game);
          }
        }
      }

      return found;
    },

    async searchMany(titles) {
      const unique = [...new Set(titles)];
      const found = await searchExactNames(unique);

      for (const title of unique.filter((value) => !found.has(value))) {
        found.set(title, (await query<IgdbSearchGameDto>("games", searchBody(title))).map(toSearchResult));
      }

      return found;
    },

    async getGamesData(igdbIds) {
      const requested = await fetchBatchGames([...new Set(igdbIds)]);
      const byId = new Map(requested.map((game) => [game.id, game]));
      // version_parent es el juego principal de una edición: se guardan los datos del base.
      const missingBases = [...new Set(requested.flatMap((game) => game.version_parent ?? []))].filter((id) => !byId.has(id));

      for (const base of await fetchBatchGames(missingBases)) {
        byId.set(base.id, base);
      }

      const baseOf = (game: IgdbBatchGameDto) => byId.get(game.version_parent ?? game.id);
      const times = await fetchTimesToBeat([...new Set(requested.map((game) => game.version_parent ?? game.id))]);
      const games = new Map<number, MatchedGame>();

      for (const game of requested) {
        const base = baseOf(game);

        if (base) {
          games.set(game.id, toMatchedGame(base, times.get(base.id)));
        }
      }

      return games;
    },

    async search(text, signal) {
      const games = await query<IgdbSearchGameDto>("games", searchBody(text), signal);
      return games.map(toSearchResult);
    },

    async getGame(igdbId) {
      const requested = await fetchGame(igdbId);

      if (!requested) {
        return null;
      }

      // version_parent es el juego principal de una edición; parent_game sería un DLC.
      const baseId = requested.version_parent ?? requested.id;
      const [base, timeToBeat] = await Promise.all([
        baseId === requested.id ? requested : fetchGame(baseId),
        fetchTimeToBeat(baseId),
      ]);

      return base ? toGameData(base, timeToBeat) : null;
    },
  };
}

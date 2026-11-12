import type { IgdbEnv } from "@/config/env";
import type { IgdbGameData, IgdbSearchResult } from "@/model/game/catalog";
import { logger } from "@/shared/logger";

import type { IgdbGameDto, IgdbSearchGameDto, IgdbTimeToBeatDto } from "./dto/igdb-dto";
import { IgdbRateLimitError, IgdbTimeoutError, IgdbUnavailableError } from "./errors";
import { toGameData, toSearchResult } from "./igdb-mapper";
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

export type IgdbAdapter = Readonly<{
  search(text: string, signal?: AbortSignal): Promise<readonly IgdbSearchResult[]>;
  getGame(igdbId: number): Promise<IgdbGameData | null>;
}>;

type IgdbAdapterDependencies = Readonly<{
  getEnv: () => IgdbEnv;
  tokenStore: IgdbTokenStore;
  timeoutMs?: number;
  now?: () => number;
}>;

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
}: IgdbAdapterDependencies): IgdbAdapter {
  // Las credenciales se leen al primer pedido: sin ellas, la biblioteca sigue andando.
  const tokens = createIgdbTokenProvider({
    tokenUrl: () => getEnv().TWITCH_TOKEN_URL,
    clientId: () => getEnv().TWITCH_CLIENT_ID,
    clientSecret: () => getEnv().TWITCH_CLIENT_SECRET,
    tokenStore,
    now,
  });

  function send(endpoint: string, body: string, token: string, signal?: AbortSignal): Promise<Response> {
    const { IGDB_API_URL, TWITCH_CLIENT_ID } = getEnv();
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

  return {
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

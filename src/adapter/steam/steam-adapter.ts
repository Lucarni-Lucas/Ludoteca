import type { z } from "zod";

import type { SteamEnv } from "@/config/env";
import type { ImportRow } from "@/model/import/import-row";
import { logger } from "@/shared/logger";

import { ownedGamesResponseSchema, VANITY_FOUND, vanityResponseSchema } from "./dto/steam-dto";
import {
  SteamGamesPrivateError,
  SteamNotConfiguredError,
  SteamProfileNotFoundError,
  SteamTimeoutError,
  SteamUnavailableError,
} from "./errors";
import { toImportRow } from "./steam-mapper";

const DEFAULT_TIMEOUT_MS = 8000;
const RESOLVE_VANITY_PATH = "/ISteamUser/ResolveVanityURL/v1/";
const OWNED_GAMES_PATH = "/IPlayerService/GetOwnedGames/v1/";

export type SteamAdapter = Readonly<{
  isConfigured(): boolean;
  /** El SteamID64 del nombre de un link personalizado. */
  resolveVanity(name: string): Promise<string>;
  getOwnedGames(steamId: string): Promise<readonly ImportRow[]>;
}>;

type SteamAdapterDependencies = Readonly<{
  /** `null` si falta la clave. */
  getEnv: () => SteamEnv | null;
  timeoutMs?: number;
}>;

/** La clave va en la query (Steam no acepta otra forma): por eso nunca se registra la URL ni la respuesta. */
function toProviderError(error: unknown): Error {
  const name = error instanceof Error ? error.name : "desconocido";
  logger.warn("Falló el pedido a Steam", { errorName: name });
  return name === "TimeoutError" ? new SteamTimeoutError() : new SteamUnavailableError();
}

export function createSteamAdapter({ getEnv, timeoutMs = DEFAULT_TIMEOUT_MS }: SteamAdapterDependencies): SteamAdapter {
  /** Sin la clave, la fuente Steam lo dice; el resto de la importación sigue andando. */
  function readEnv(): SteamEnv {
    const env = getEnv();

    if (!env) {
      throw new SteamNotConfiguredError();
    }

    return env;
  }

  async function fetchJson(path: string, params: Readonly<Record<string, string>>): Promise<unknown> {
    const { STEAM_API_KEY, STEAM_API_URL } = readEnv();
    const url = new URL(path, STEAM_API_URL);

    for (const [name, value] of Object.entries({ key: STEAM_API_KEY, format: "json", ...params })) {
      url.searchParams.set(name, value);
    }

    let response: Response;

    try {
      response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      throw toProviderError(error);
    }

    if (!response.ok) {
      logger.warn("Steam respondió con error", { status: response.status });
      throw new SteamUnavailableError();
    }

    try {
      return await response.json();
    } catch (error) {
      throw toProviderError(error);
    }
  }

  async function query<T>(schema: z.ZodType<T>, path: string, params: Readonly<Record<string, string>>): Promise<T> {
    const parsed = schema.safeParse(await fetchJson(path, params));

    if (!parsed.success) {
      logger.warn("Steam respondió con una forma inesperada", { path });
      throw new SteamUnavailableError();
    }

    return parsed.data;
  }

  return {
    isConfigured() {
      return getEnv() !== null;
    },

    async resolveVanity(name) {
      const { response } = await query(vanityResponseSchema, RESOLVE_VANITY_PATH, { vanityurl: name });

      if (response.success !== VANITY_FOUND || !response.steamid) {
        throw new SteamProfileNotFoundError();
      }

      return response.steamid;
    },

    async getOwnedGames(steamId) {
      const { response } = await query(ownedGamesResponseSchema, OWNED_GAMES_PATH, {
        steamid: steamId,
        include_appinfo: "1",
        include_played_free_games: "1",
      });

      if (response.game_count === undefined) {
        throw new SteamGamesPrivateError();
      }

      return (response.games ?? []).map(toImportRow);
    },
  };
}

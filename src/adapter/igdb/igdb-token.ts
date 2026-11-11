import type { ProviderToken } from "@/model/game/catalog";
import { logger } from "@/shared/logger";

import type { TwitchTokenDto } from "./dto/igdb-dto";
import { IgdbUnavailableError } from "./errors";

const MILLISECONDS_PER_SECOND = 1000;
// Un token a punto de vencer podría morir en el camino hasta IGDB.
const EXPIRY_MARGIN_MS = 60_000;

export type IgdbTokenStore = Readonly<{
  read(): Promise<ProviderToken | null>;
  write(token: ProviderToken): Promise<void>;
}>;

type TokenProviderDependencies = Readonly<{
  tokenUrl: () => string;
  clientId: () => string;
  clientSecret: () => string;
  tokenStore: IgdbTokenStore;
  now: () => number;
}>;

export type IgdbTokenProvider = Readonly<{
  getToken(): Promise<string>;
  renewToken(): Promise<string>;
}>;

/** Memoria, después lo guardado y recién entonces Twitch: el token dura unos dos meses. */
export function createIgdbTokenProvider(dependencies: TokenProviderDependencies): IgdbTokenProvider {
  const { tokenUrl, clientId, clientSecret, tokenStore, now } = dependencies;
  let cached: ProviderToken | null = null;

  function isUsable(token: ProviderToken | null): token is ProviderToken {
    return token !== null && new Date(token.expiresAt).getTime() - EXPIRY_MARGIN_MS > now();
  }

  async function requestToken(): Promise<TwitchTokenDto> {
    const url = new URL(tokenUrl());
    url.searchParams.set("client_id", clientId());
    url.searchParams.set("client_secret", clientSecret());
    url.searchParams.set("grant_type", "client_credentials");

    try {
      const response = await fetch(url, { method: "POST" });

      if (!response.ok) {
        throw new Error(`Twitch respondió ${response.status}`);
      }

      return (await response.json()) as TwitchTokenDto;
    } catch (error) {
      logger.warn("No se pudo pedir el token de Twitch", { error });
      throw new IgdbUnavailableError();
    }
  }

  async function renewToken(): Promise<string> {
    const dto = await requestToken();
    const token = {
      accessToken: dto.access_token,
      expiresAt: new Date(now() + dto.expires_in * MILLISECONDS_PER_SECOND).toISOString(),
    };

    await tokenStore.write(token);
    cached = token;
    return token.accessToken;
  }

  return {
    renewToken,

    async getToken() {
      if (isUsable(cached)) {
        return cached.accessToken;
      }

      const stored = await tokenStore.read();

      if (isUsable(stored)) {
        cached = stored;
        return stored.accessToken;
      }

      return renewToken();
    },
  };
}

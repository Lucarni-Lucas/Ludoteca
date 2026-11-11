import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import type { IgdbEnv } from "@/config/env";
import type { ProviderToken } from "@/model/game/catalog";

export const IGDB_URL = "https://igdb.test/v4";
export const TOKEN_URL = "https://twitch.test/token";

export const ENV: IgdbEnv = {
  TWITCH_CLIENT_ID: "cliente",
  TWITCH_CLIENT_SECRET: "secreto",
  IGDB_API_URL: IGDB_URL,
  TWITCH_TOKEN_URL: TOKEN_URL,
};

export const server = setupServer();

export function createMemoryTokenStore(initial: ProviderToken | null = null) {
  const store = {
    saved: initial,
    async read() {
      return store.saved;
    },
    async write(token: ProviderToken) {
      store.saved = token;
    },
  };

  return store;
}

/** Twitch siempre responde y cuenta cuántos tokens entregó. */
export function serveTwitch(accessToken = "token-nuevo") {
  const calls = { count: 0 };

  server.use(
    http.post(TOKEN_URL, () => {
      calls.count += 1;
      return HttpResponse.json({ access_token: accessToken, expires_in: 5_000_000, token_type: "bearer" });
    }),
  );

  return calls;
}

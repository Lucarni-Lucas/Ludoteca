import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  SteamGamesPrivateError,
  SteamNotConfiguredError,
  SteamProfileNotFoundError,
  SteamTimeoutError,
  SteamUnavailableError,
} from "@/adapter/steam/errors";
import { createSteamAdapter } from "@/adapter/steam/steam-adapter";

const STEAM_URL = "https://steam.test";
const API_KEY = "clave-secreta-de-steam";
const ENV = { STEAM_API_KEY: API_KEY, STEAM_API_URL: STEAM_URL };
const OWNED_GAMES = `${STEAM_URL}/IPlayerService/GetOwnedGames/v1/`;
const RESOLVE_VANITY = `${STEAM_URL}/ISteamUser/ResolveVanityURL/v1/`;
const STEAM_ID = "76561197960287930";

// Las formas son las de Steam real (tasks.md 4.3), con datos inventados.
const PUBLIC_PROFILE = {
  response: {
    game_count: 2,
    games: [
      { appid: 367520, name: "Hollow Knight", playtime_forever: 2880, img_icon_url: "abc", has_community_visible_stats: true },
      { appid: 250420, name: "8BitMMO", playtime_forever: 0, img_icon_url: "def", content_descriptorids: [5] },
    ],
  },
};
const PRIVATE_PROFILE = { response: {} };
const VANITY_FOUND = { response: { steamid: STEAM_ID, success: 1 } };
const VANITY_MISSING = { response: { success: 42, message: "No match" } };

const server = setupServer();
const warn = vi.spyOn(console, "warn");

function adapter(timeoutMs?: number) {
  return createSteamAdapter({ getEnv: () => ENV, timeoutMs });
}

function respond(url: string, body: unknown, status = 200) {
  server.use(http.get(url, () => HttpResponse.json(body as object, { status })));
}

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
  server.resetHandlers();
  warn.mockReset();
  warn.mockImplementation(() => undefined);
});

afterAll(() => {
  server.close();
  vi.restoreAllMocks();
});

describe("getOwnedGames", () => {
  it("Perfil público", async () => {
    respond(OWNED_GAMES, PUBLIC_PROFILE);

    const rows = await adapter().getOwnedGames(STEAM_ID);

    expect(rows).toEqual([
      expect.objectContaining({
        source: "steam",
        sourceKey: "367520",
        title: "Hollow Knight",
        storeName: "Steam",
        storeGameId: "367520",
        playtimeMinutes: 2880,
        steamAppId: "367520",
      }),
      expect.objectContaining({ sourceKey: "250420", playtimeMinutes: 0 }),
    ]);
  });

  it("pide los juegos con sus nombres y los gratuitos jugados", async () => {
    const requested: URL[] = [];
    server.use(
      http.get(OWNED_GAMES, ({ request }) => {
        requested.push(new URL(request.url));
        return HttpResponse.json(PUBLIC_PROFILE);
      }),
    );

    await adapter().getOwnedGames(STEAM_ID);

    const params = Object.fromEntries(requested[0].searchParams);
    expect(params).toMatchObject({ steamid: STEAM_ID, include_appinfo: "1", include_played_free_games: "1", key: API_KEY });
  });

  it("Perfil privado", async () => {
    respond(OWNED_GAMES, PRIVATE_PROFILE);

    const request = adapter().getOwnedGames(STEAM_ID);

    await expect(request).rejects.toBeInstanceOf(SteamGamesPrivateError);
  });

  it("un perfil público sin juegos devuelve una lista vacía", async () => {
    respond(OWNED_GAMES, { response: { game_count: 0 } });

    const rows = await adapter().getOwnedGames(STEAM_ID);

    expect(rows).toEqual([]);
  });

  it.each([429, 500, 503, 401])("un %s da SteamUnavailableError", async (status) => {
    respond(OWNED_GAMES, {}, status);

    const request = adapter().getOwnedGames(STEAM_ID);

    await expect(request).rejects.toBeInstanceOf(SteamUnavailableError);
  });

  it("una respuesta que no es JSON da SteamUnavailableError", async () => {
    server.use(http.get(OWNED_GAMES, () => new HttpResponse("<html>", { status: 200 })));

    const request = adapter().getOwnedGames(STEAM_ID);

    await expect(request).rejects.toBeInstanceOf(SteamUnavailableError);
  });

  it("un error de red da SteamUnavailableError", async () => {
    server.use(http.get(OWNED_GAMES, () => HttpResponse.error()));

    const request = adapter().getOwnedGames(STEAM_ID);

    await expect(request).rejects.toBeInstanceOf(SteamUnavailableError);
  });

  it("si Steam no responde a tiempo da SteamTimeoutError", async () => {
    server.use(
      http.get(OWNED_GAMES, async () => {
        await delay(200);
        return HttpResponse.json(PUBLIC_PROFILE);
      }),
    );

    const request = adapter(20).getOwnedGames(STEAM_ID);

    await expect(request).rejects.toBeInstanceOf(SteamTimeoutError);
  });

  it("ningún log tiene la clave", async () => {
    server.use(http.get(OWNED_GAMES, () => HttpResponse.error()));
    await adapter().getOwnedGames(STEAM_ID).catch(() => undefined);
    respond(OWNED_GAMES, {}, 500);
    await adapter().getOwnedGames(STEAM_ID).catch(() => undefined);
    respond(OWNED_GAMES, { inesperado: true });

    await adapter().getOwnedGames(STEAM_ID).catch(() => undefined);

    expect(warn).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(warn.mock.calls)).not.toContain(API_KEY);
  });
});

describe("resolveVanity", () => {
  it("devuelve el SteamID64 del nombre", async () => {
    respond(RESOLVE_VANITY, VANITY_FOUND);

    const steamId = await adapter().resolveVanity("gaben");

    expect(steamId).toBe(STEAM_ID);
  });

  it("un nombre inexistente da SteamProfileNotFoundError", async () => {
    respond(RESOLVE_VANITY, VANITY_MISSING);

    const request = adapter().resolveVanity("no-existe");

    await expect(request).rejects.toBeInstanceOf(SteamProfileNotFoundError);
  });
});

describe("sin la clave de Steam", () => {
  it("dice que no está configurado y no llama a Steam", async () => {
    const unconfigured = createSteamAdapter({ getEnv: () => null });

    const request = unconfigured.getOwnedGames(STEAM_ID);

    expect(unconfigured.isConfigured()).toBe(false);
    expect(adapter().isConfigured()).toBe(true);
    await expect(request).rejects.toBeInstanceOf(SteamNotConfiguredError);
  });
});

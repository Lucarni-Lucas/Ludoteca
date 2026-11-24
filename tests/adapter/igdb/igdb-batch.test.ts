import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { IgdbRateLimitError } from "@/adapter/igdb/errors";
import { createIgdbAdapter, MIN_REQUEST_INTERVAL_MS, type RequestPacing } from "@/adapter/igdb/igdb-adapter";
import { logger } from "@/shared/logger";

import { createMemoryTokenStore, ENV, IGDB_URL, server } from "./igdb-server";

const NOW = Date.parse("2026-11-23T12:00:00Z");
const VALID_TOKEN = { accessToken: "token-guardado", expiresAt: "2027-01-01T00:00:00.000Z" };
const GAMES = `${IGDB_URL}/games`;
const EXTERNAL_GAMES = `${IGDB_URL}/external_games`;
const MULTIQUERY = `${IGDB_URL}/multiquery`;
const TIME_TO_BEAT = `${IGDB_URL}/game_time_to_beats`;

/** Sin espera real entre pedidos, salvo en el test que la mide. */
const NO_WAIT: RequestPacing = { intervalMs: 0, now: () => 0, sleep: () => Promise.resolve() };

function adapterWith(pacing: RequestPacing = NO_WAIT) {
  return createIgdbAdapter({ getEnv: () => ENV, tokenStore: createMemoryTokenStore(VALID_TOKEN), now: () => NOW, pacing });
}

type Recorded = { endpoint: string; body: string; at: number };

function record(endpoint: string, reply: (body: string) => unknown, calls: Recorded[] = []) {
  server.use(
    http.post(endpoint, async ({ request }) => {
      const at = performance.now();
      const body = await request.text();
      calls.push({ endpoint, body, at });
      return HttpResponse.json(reply(body) as object);
    }),
  );
  return calls;
}

/** Responde cada consulta de un multiquery con el juego que tiene ese nombre exacto, si lo hay. */
function serveExactNames(names: readonly string[], calls: Recorded[] = []) {
  return record(
    MULTIQUERY,
    (body) =>
      [...body.matchAll(/query games "(\d+)" \{[^}]*where name ~ "([^"]+)"/g)].map(([, label, title], index) => ({
        name: label,
        result: names.includes(title) ? [{ id: 1000 + index, name: title }] : [],
      })),
    calls,
  );
}

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
  vi.spyOn(logger, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  vi.restoreAllMocks();
});

describe("findByExternalIds", () => {
  it("Cruce por ID de Steam", async () => {
    const asked = record(EXTERNAL_GAMES, () => [{ uid: "1966900", game: 199748 }]);
    const searched = record(GAMES, () => []);

    const found = await adapterWith().findByExternalIds("steam", ["1966900"]);

    expect(found).toEqual(new Map([["1966900", 199748]]));
    expect(asked[0].body).toContain('where external_game_source = 1 & uid = ("1966900");');
    expect(searched).toEqual([]);
  });

  it("busca los de GOG con su fuente y pide todos los IDs en un solo pedido", async () => {
    const asked = record(EXTERNAL_GAMES, () => [{ uid: "1199381642", game: 36766 }]);

    const found = await adapterWith().findByExternalIds("gog", ["1199381642", "999", "1199381642"]);

    expect(asked).toHaveLength(1);
    expect(asked[0].body).toContain('external_game_source = 5 & uid = ("1199381642","999")');
    expect(found.get("999")).toBeUndefined();
  });

  it("sin IDs no pide nada", async () => {
    const asked = record(EXTERNAL_GAMES, () => []);

    const found = await adapterWith().findByExternalIds("steam", []);

    expect(found.size).toBe(0);
    expect(asked).toEqual([]);
  });
});

describe("searchMany", () => {
  it("multiquery con 12 títulos hace 2 pedidos", async () => {
    const titles = Array.from({ length: 12 }, (_, index) => `Juego ${index + 1}`);
    const calls = serveExactNames(titles);

    const found = await adapterWith().searchMany(titles);

    expect(calls).toHaveLength(2);
    expect(found.size).toBe(12);
    expect(found.get("Juego 11")).toEqual([expect.objectContaining({ title: "Juego 11" })]);
  });

  it("busca por nombre exacto sin distinguir mayúsculas y con el filtro de tipos de la búsqueda", async () => {
    const calls = serveExactNames(["Hades"]);

    await adapterWith().searchMany(["Hades"]);

    expect(calls[0].body).toContain('where name ~ "Hades" & (game_type = (0,4,8,9,10,11) | version_parent != null);');
  });

  it("los títulos sin nombre exacto se buscan con search de a uno", async () => {
    serveExactNames(["Hades"]);
    const searched = record(GAMES, (body) => (body.includes('search "KillingFloor2"') ? [{ id: 5, name: "Killing Floor 2" }] : []));

    const found = await adapterWith().searchMany(["Hades", "KillingFloor2"]);

    expect(searched).toHaveLength(1);
    expect(found.get("KillingFloor2")).toEqual([expect.objectContaining({ igdbId: 5, title: "Killing Floor 2" })]);
  });

  it("los pedidos quedan separados al menos 250 ms", async () => {
    let virtualNow = 0;
    const sentAt: number[] = [];
    const pacing: RequestPacing = {
      intervalMs: MIN_REQUEST_INTERVAL_MS,
      now: () => virtualNow,
      sleep: (ms) => {
        virtualNow += ms;
        return Promise.resolve();
      },
    };
    server.use(
      http.post(MULTIQUERY, () => {
        sentAt.push(virtualNow);
        return HttpResponse.json([{ name: "0", result: [] }, { name: "1", result: [] }]);
      }),
      http.post(GAMES, () => {
        sentAt.push(virtualNow);
        return HttpResponse.json([]);
      }),
    );

    await adapterWith(pacing).searchMany(["Uno", "Dos"]);

    const gaps = sentAt.slice(1).map((at, index) => at - sentAt[index]);
    expect(sentAt).toHaveLength(3);
    expect(gaps).toEqual([MIN_REQUEST_INTERVAL_MS, MIN_REQUEST_INTERVAL_MS]);
  });

  it("un 429 da IgdbRateLimitError", async () => {
    server.use(http.post(MULTIQUERY, () => HttpResponse.json({ message: "Too Many Requests" }, { status: 429 })));

    const search = adapterWith().searchMany(["Hades"]);

    await expect(search).rejects.toBeInstanceOf(IgdbRateLimitError);
  });
});

describe("getGamesData", () => {
  it("trae de a muchos los datos, los modos y la duración", async () => {
    const gamesAsked = record(GAMES, () => [
      { id: 199748, name: "20 Minutes Till Dawn", game_modes: [{ slug: "single-player" }] },
      { id: 4, name: "Among Us", game_modes: [{ slug: "multiplayer" }, { slug: "co-operative" }] },
    ]);
    const timesAsked = record(TIME_TO_BEAT, () => [{ game_id: 199748, normally: 89_400 }]);

    const games = await adapterWith().getGamesData([199748, 4]);

    expect(gamesAsked).toHaveLength(1);
    expect(gamesAsked[0].body).toContain("game_modes.slug");
    expect(gamesAsked[0].body).toContain("where id = (199748,4);");
    expect(timesAsked[0].body).toContain("where game_id = (199748,4);");
    expect(games.get(199748)).toMatchObject({ igdbId: 199748, title: "20 Minutes Till Dawn", estimatedHours: 24.8, multiplayerOnly: false });
    expect(games.get(4)).toMatchObject({ igdbId: 4, estimatedHours: null, multiplayerOnly: true });
  });

  it("una edición pasa a su juego base", async () => {
    const asked = record(GAMES, (body) =>
      body.includes("(7)")
        ? [{ id: 7, name: "The Outer Worlds: Spacer's Choice Edition", version_parent: 42 }]
        : [{ id: 42, name: "The Outer Worlds", game_modes: [{ slug: "single-player" }] }],
    );
    const times = record(TIME_TO_BEAT, () => []);

    const games = await adapterWith().getGamesData([7]);

    expect(games.get(7)).toMatchObject({ igdbId: 42, title: "The Outer Worlds" });
    expect(asked).toHaveLength(2);
    expect(times[0].body).toContain("where game_id = (42);");
  });

  it("un juego que IGDB no devuelve no aparece", async () => {
    record(GAMES, () => []);
    record(TIME_TO_BEAT, () => []);

    const games = await adapterWith().getGamesData([999]);

    expect(games.size).toBe(0);
  });
});

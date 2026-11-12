import { delay, http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { IgdbRateLimitError, IgdbTimeoutError, IgdbUnavailableError } from "@/adapter/igdb/errors";
import { createIgdbAdapter, type IgdbAdapter } from "@/adapter/igdb/igdb-adapter";
import { logger } from "@/shared/logger";

import { createMemoryTokenStore, ENV, IGDB_URL, server, serveTwitch } from "./igdb-server";

const NOW = Date.parse("2026-11-06T12:00:00Z");
const VALID_TOKEN = { accessToken: "token-guardado", expiresAt: "2027-01-01T00:00:00.000Z" };
const GAMES = `${IGDB_URL}/games`;
const TIME_TO_BEAT = `${IGDB_URL}/game_time_to_beats`;

function adapterWith(tokenStore = createMemoryTokenStore(VALID_TOKEN), timeoutMs?: number): IgdbAdapter {
  return createIgdbAdapter({ getEnv: () => ENV, tokenStore, timeoutMs, now: () => NOW });
}

function respondWith(endpoint: string, body: unknown, status = 200) {
  server.use(http.post(endpoint, () => HttpResponse.json(body as object, { status })));
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

describe("search", () => {
  it("traduce el año, la portada chica y el id base", async () => {
    respondWith(GAMES, [
      {
        id: 7,
        name: "Sid Meier's Civilization VI: Platinum Edition",
        first_release_date: 1_486_684_800,
        cover: { image_id: "co123" },
        version_parent: 42,
      },
    ]);

    const results = await adapterWith().search("civ");

    expect(results).toEqual([
      {
        igdbId: 7,
        baseIgdbId: 42,
        title: "Sid Meier's Civilization VI: Platinum Edition",
        year: 2017,
        coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_small/co123.jpg",
      },
    ]);
  });

  it("usa el propio id como base y tolera datos faltantes", async () => {
    respondWith(GAMES, [{ id: 9, name: "Sin datos" }]);

    const results = await adapterWith().search("sin");

    expect(results).toEqual([{ igdbId: 9, baseIgdbId: 9, title: "Sin datos", year: null, coverUrl: null }]);
  });

  it("escapa las comillas para que no alteren la consulta", async () => {
    const bodies: string[] = [];
    server.use(
      http.post(GAMES, async ({ request }) => {
        bodies.push(await request.text());
        return HttpResponse.json([]);
      }),
    );

    await adapterWith().search('ha"des');

    expect(bodies[0]).toContain(String.raw`search "ha\"des";`);
  });

  it("manda las credenciales y filtra por los tipos de juego que se pueden tener", async () => {
    const seen: Array<{ clientId: string | null; authorization: string | null; body: string }> = [];
    server.use(
      http.post(GAMES, async ({ request }) => {
        seen.push({
          clientId: request.headers.get("Client-ID"),
          authorization: request.headers.get("Authorization"),
          body: await request.text(),
        });
        return HttpResponse.json([]);
      }),
    );

    await adapterWith().search("hades");

    expect(seen[0].clientId).toBe("cliente");
    expect(seen[0].authorization).toBe("Bearer token-guardado");
    expect(seen[0].body).toContain("where (game_type = (0,4,8,9,10,11) | version_parent != null);");
  });

  it.each([
    { description: "429", status: 429, error: IgdbRateLimitError },
    { description: "500", status: 500, error: IgdbUnavailableError },
    { description: "503", status: 503, error: IgdbUnavailableError },
  ])("convierte un $description en un error propio", async ({ status, error }) => {
    respondWith(GAMES, { message: "error del proveedor" }, status);

    const search = adapterWith().search("hades");

    await expect(search).rejects.toBeInstanceOf(error);
  });

  it("convierte un timeout en un error propio", async () => {
    server.use(
      http.post(GAMES, async () => {
        await delay("infinite");
        return HttpResponse.json([]);
      }),
    );

    const search = adapterWith(createMemoryTokenStore(VALID_TOKEN), 20).search("hades");

    await expect(search).rejects.toBeInstanceOf(IgdbTimeoutError);
  });

  it("no deja salir un error crudo de fetch", async () => {
    server.use(http.post(GAMES, () => HttpResponse.error()));

    const search = adapterWith().search("hades");

    await expect(search).rejects.toBeInstanceOf(IgdbUnavailableError);
  });

  it("convierte una respuesta que no es JSON en un error propio", async () => {
    server.use(http.post(GAMES, () => new HttpResponse("<html>", { status: 200 })));

    const search = adapterWith().search("hades");

    await expect(search).rejects.toBeInstanceOf(IgdbUnavailableError);
  });
});

describe("token", () => {
  it("usa el token guardado sin pedirle otro a Twitch", async () => {
    const twitch = serveTwitch();
    respondWith(GAMES, []);

    await adapterWith().search("hades");

    expect(twitch.count).toBe(0);
  });

  it("pide y guarda un token nuevo cuando no hay ninguno", async () => {
    const twitch = serveTwitch();
    const tokenStore = createMemoryTokenStore();
    respondWith(GAMES, []);

    await adapterWith(tokenStore).search("hades");

    expect(twitch.count).toBe(1);
    expect(tokenStore.saved?.accessToken).toBe("token-nuevo");
  });

  it("renueva un token vencido", async () => {
    const twitch = serveTwitch();
    const tokenStore = createMemoryTokenStore({ accessToken: "viejo", expiresAt: "2026-01-01T00:00:00.000Z" });
    respondWith(GAMES, []);

    await adapterWith(tokenStore).search("hades");

    expect(twitch.count).toBe(1);
    expect(tokenStore.saved?.accessToken).toBe("token-nuevo");
  });

  it("guarda en memoria el token leído y no vuelve a la base", async () => {
    const tokenStore = createMemoryTokenStore(VALID_TOKEN);
    const read = vi.spyOn(tokenStore, "read");
    respondWith(GAMES, []);
    const adapter = adapterWith(tokenStore);

    await adapter.search("hades");
    await adapter.search("celeste");

    expect(read).toHaveBeenCalledTimes(1);
  });

  it("con un 401 renueva el token y reintenta", async () => {
    const twitch = serveTwitch();
    const tokens: Array<string | null> = [];
    server.use(
      http.post(GAMES, ({ request }) => {
        tokens.push(request.headers.get("Authorization"));
        return tokens.length === 1 ? new HttpResponse(null, { status: 401 }) : HttpResponse.json([]);
      }),
    );

    await adapterWith().search("hades");

    expect(twitch.count).toBe(1);
    expect(tokens).toEqual(["Bearer token-guardado", "Bearer token-nuevo"]);
  });

  it("con dos 401 seguidos reintenta una sola vez y falla con un error propio", async () => {
    serveTwitch();
    const calls = { count: 0 };
    server.use(
      http.post(GAMES, () => {
        calls.count += 1;
        return new HttpResponse(null, { status: 401 });
      }),
    );

    const search = adapterWith().search("hades");

    await expect(search).rejects.toBeInstanceOf(IgdbUnavailableError);
    expect(calls.count).toBe(2);
  });

  it("convierte un error de Twitch en un error propio", async () => {
    server.use(http.post(ENV.TWITCH_TOKEN_URL, () => new HttpResponse(null, { status: 500 })));

    const search = adapterWith(createMemoryTokenStore()).search("hades");

    await expect(search).rejects.toBeInstanceOf(IgdbUnavailableError);
  });
});

describe("getGame", () => {
  const hades = {
    id: 100,
    name: "Hades",
    first_release_date: 1_600_300_800,
    cover: { image_id: "co1" },
    url: "https://www.igdb.com/games/hades",
  };

  function serveGames(games: ReadonlyArray<Record<string, unknown> & { id: number }>) {
    const asked: string[] = [];
    server.use(
      http.post(GAMES, async ({ request }) => {
        const body = await request.text();
        asked.push(body);
        const id = Number(/where id = (\d+);/.exec(body)?.[1]);
        return HttpResponse.json(games.filter((game) => game.id === id));
      }),
    );
    return asked;
  }

  it("trae los datos y la portada grande", async () => {
    serveGames([hades]);
    respondWith(TIME_TO_BEAT, [{ normally: 79_200 }]);

    const game = await adapterWith().getGame(100);

    expect(game).toEqual({
      igdbId: 100,
      title: "Hades",
      year: 2020,
      developer: null,
      coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1.jpg",
      pageUrl: "https://www.igdb.com/games/hades",
      estimatedHours: 22,
      endless: false,
    });
  });

  it("resuelve una edición con version_parent y guarda el juego base", async () => {
    const asked = serveGames([
      { id: 7, name: "Civilization VI: Platinum Edition", version_parent: 42 },
      { id: 42, name: "Civilization VI" },
    ]);
    const timeAsked: string[] = [];
    server.use(
      http.post(TIME_TO_BEAT, async ({ request }) => {
        timeAsked.push(await request.text());
        return HttpResponse.json([]);
      }),
    );

    const game = await adapterWith().getGame(7);

    expect(game?.igdbId).toBe(42);
    expect(game?.title).toBe("Civilization VI");
    expect(asked).toHaveLength(2);
    expect(timeAsked[0]).toContain("where game_id = 42;");
  });

  it("deja la duración vacía si IGDB no tiene game_time_to_beats", async () => {
    serveGames([hades]);
    respondWith(TIME_TO_BEAT, []);

    const game = await adapterWith().getGame(100);

    expect(game?.estimatedHours).toBeNull();
  });

  it("convierte segundos a horas con un decimal", async () => {
    serveGames([hades]);
    respondWith(TIME_TO_BEAT, [{ normally: 45_000 }]);

    const game = await adapterWith().getGame(100);

    expect(game?.estimatedHours).toBeCloseTo(12.5, 5);
  });

  it("toma como desarrollador la primera compañía marcada como tal", async () => {
    serveGames([
      {
        ...hades,
        involved_companies: [
          { developer: false, company: { name: "Publisher" } },
          { developer: true, company: { name: "Supergiant Games" } },
          { developer: true, company: { name: "Otra" } },
        ],
      },
    ]);
    respondWith(TIME_TO_BEAT, []);

    const game = await adapterWith().getGame(100);

    expect(game?.developer).toBe("Supergiant Games");
  });

  it("devuelve null si el juego no existe", async () => {
    serveGames([]);

    const game = await adapterWith().getGame(999);

    expect(game).toBeNull();
  });
});

describe("search con textos cortos", () => {
  function captureBodies(): string[] {
    const bodies: string[] = [];
    server.use(
      http.post(GAMES, async ({ request }) => {
        bodies.push(await request.text());
        return HttpResponse.json([]);
      }),
    );
    return bodies;
  }

  it("Sugerencias desde tres letras", async () => {
    const bodies = captureBodies();

    await adapterWith().search("hol");

    expect(bodies[0]).toContain('where name ~ "hol"* & (game_type = (0,4,8,9,10,11) | version_parent != null);');
    expect(bodies[0]).toContain("sort total_rating_count desc;");
    expect(bodies[0]).not.toContain("search ");
  });

  it("con dos letras también busca por el comienzo del nombre", async () => {
    const bodies = captureBodies();

    await adapterWith().search("ho");

    expect(bodies[0]).toContain('where name ~ "ho"*');
  });

  it("desde cuatro letras usa la búsqueda de IGDB", async () => {
    const bodies = captureBodies();

    await adapterWith().search("holl");

    expect(bodies[0]).toContain('search "holl";');
    expect(bodies[0]).not.toContain("name ~");
  });

  it("escapa las comillas también en la búsqueda por prefijo", async () => {
    const bodies = captureBodies();

    await adapterWith().search('h"o');

    expect(bodies[0]).toContain(String.raw`where name ~ "h\"o"*`);
  });
});

describe("search con ediciones", () => {
  it("Agregar una edición", async () => {
    const bodies: string[] = [];
    server.use(
      http.post(GAMES, async ({ request }) => {
        bodies.push(await request.text());
        return HttpResponse.json([{ id: 136199, name: "Sid Meier's Civilization VI: Platinum Edition", version_parent: 19130 }]);
      }),
    );

    const results = await adapterWith().search("civilization vi platinum");

    expect(bodies[0]).toContain("version_parent != null");
    expect(results).toEqual([
      { igdbId: 136199, baseIgdbId: 19130, title: "Sid Meier's Civilization VI: Platinum Edition", year: null, coverUrl: null },
    ]);
  });
});

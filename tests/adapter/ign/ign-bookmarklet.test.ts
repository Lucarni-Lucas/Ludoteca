import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { readIgnExport } from "@/adapter/ign/ign-adapter";
import {
  type BookmarkletDeps,
  buildIgnBookmarklet,
  exportIgnLibrary,
  IGN_API_URL,
  IGN_EXPORT_FILE_NAME,
} from "@/adapter/ign/ign-bookmarklet";

type ApiSample = Readonly<{ libraryPages: readonly unknown[]; reviews: unknown }>;

const SAMPLE = JSON.parse(readFileSync(path.resolve("tests/adapter/ign/ign-api-sample.json"), "utf8")) as ApiSample;
const SIGNED_OUT = { errors: [{ message: "Unauthorized" }], data: null };
const MESSAGES = { wrongSite: "fuera de IGN", signedOut: "sin sesión", failed: "falló", empty: "lista vacía" };
const EXPORTED_AT = "2026-11-24T15:00:00.000Z";

type Request = Readonly<{ url: string; init: RequestInit; body: { query: string; variables: Record<string, unknown> } }>;

/** Una API de IGN falsa que contesta con la muestra: la biblioteca por páginas y después los puntajes. */
function fakeIgn(responses: Readonly<{ library?: readonly unknown[]; reviews?: unknown }> = {}) {
  const library = [...(responses.library ?? SAMPLE.libraryPages)];
  const requests: Request[] = [];
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Request["body"];
    requests.push({ url, init, body });
    const answer = body.query.includes("searchLibrary") ? library.shift() : (responses.reviews ?? SAMPLE.reviews);
    return new Response(JSON.stringify(answer));
  });
  return { fetch, requests };
}

function run(overrides: Partial<BookmarkletDeps> = {}) {
  const ign = fakeIgn();
  const downloads: { fileName: string; text: string }[] = [];
  const deps: BookmarkletDeps = {
    fetch: ign.fetch,
    hostname: "www.ign.com",
    now: () => EXPORTED_AT,
    download: (fileName, text) => downloads.push({ fileName, text }),
    alert: vi.fn(),
    messages: MESSAGES,
    ...overrides,
  };
  return { deps, downloads, requests: ign.requests, done: exportIgnLibrary(deps) };
}

function exported(downloads: readonly { text: string }[]) {
  return JSON.parse(downloads[0].text) as { records: Record<string, unknown>[] } & Record<string, unknown>;
}

describe("exportIgnLibrary", () => {
  it("Exportar de IGN", async () => {
    const { downloads, done } = run();

    await done;

    expect(downloads.map((value) => value.fileName)).toEqual([IGN_EXPORT_FILE_NAME]);
    const read = readIgnExport(exported(downloads));
    expect(read?.source).toBe("ign");
    expect(read?.rows.map((row) => [row.title, row.ignStatuses, row.ignScore, row.year, row.hltbMainHours, row.steamAppId])).toEqual([
      ["Faro del Sur", ["beat", "quit"], 9, 2022, 3.7, "1234567"],
      ["Bruma Eterna", ["wishlist"], null, null, null, null],
      ["Cartas del Faro", ["paused"], 7, 2019, 2, null],
    ]);
  });

  it("arma cada registro con el formato del archivo que ya se leía", async () => {
    const { downloads, done } = run();

    await done;

    const content = exported(downloads);
    expect(content).toMatchObject({ exportedAt: EXPORTED_AT, total: 3, count: 3, withScore: 2, errors: [] });
    expect(content.records[0]).toEqual({
      ignId: "10000000-0000-4000-8000-000000000001",
      slug: "faro-del-sur",
      name: "Faro del Sur",
      alt: ["South Lighthouse"],
      dev: ["Estudio Inventado"],
      flags: ["completed", "archived"],
      status: "beat",
      hltb: [3.7, 10, null],
      steamId: 1234567,
      itchId: null,
      year: 2022,
      platforms: ["PC"],
      added: "2025-01-10T12:00:00.000Z",
      updated: "2025-02-01T12:00:00.000Z",
      score: 9,
      scoredAt: "2025-02-02T12:00:00.000Z",
      review: null,
    });
    expect(content.records[2]).toMatchObject({ itchId: "5551", steamId: null, hltb: [2, null, 5], review: "Lindo, corto.", status: "paused" });
  });

  it("solo le pide a la API de IGN, con la sesión del navegador", async () => {
    const { requests, done } = run();

    await done;

    expect(new Set(requests.map((request) => request.url))).toEqual(new Set([IGN_API_URL]));
    expect(requests.every((request) => request.init.method === "POST" && request.init.credentials === "include")).toBe(true);
    expect(requests.some((request) => JSON.stringify(request.init.headers ?? {}).toLowerCase().includes("authorization"))).toBe(false);
  });

  it("pagina por el cursor que devuelve IGN, de a 100, y pide los puntajes de todos los juegos", async () => {
    const { requests, done } = run();

    await done;

    const library = requests.filter((request) => request.body.query.includes("searchLibrary"));
    const reviews = requests.filter((request) => request.body.query.includes("usersReviewsByObjectIds"));
    expect(library.map((request) => request.body.variables)).toEqual([
      { cursor: null, count: 100 },
      { cursor: 100, count: 100 },
    ]);
    expect(reviews.map((request) => request.body.variables.objectIds)).toEqual([
      ["10000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000002", "10000000-0000-4000-8000-000000000003"],
    ]);
  });

  it("pide los puntajes de a 100 juegos", async () => {
    const objects = Array.from({ length: 150 }, (_, index) => ({ objectId: `juego-${index}`, object: { metadata: { names: { name: `Juego ${index}` } } } }));
    const page = { data: { searchLibrary: { pageInfo: { hasNext: false, nextCursor: null, total: 150 }, libraryObjects: objects } } };
    const ign = fakeIgn({ library: [page], reviews: { data: { usersReviewsByObjectIds: [] } } });
    const { done } = run({ fetch: ign.fetch });

    await done;

    const sizes = ign.requests.filter((request) => request.body.query.includes("usersReviewsByObjectIds")).map((request) => (request.body.variables.objectIds as unknown[]).length);
    expect(sizes).toEqual([100, 50]);
  });

  it("fuera de ign.com avisa y no pide nada", async () => {
    const { deps, downloads, requests, done } = run({ hostname: "ludoteca.vercel.app" });

    await done;

    expect(deps.alert).toHaveBeenCalledWith("fuera de IGN");
    expect(requests).toEqual([]);
    expect(downloads).toEqual([]);
  });

  it("sin la sesión abierta avisa en lugar de bajar un archivo vacío", async () => {
    const ign = fakeIgn({ library: [SIGNED_OUT] });
    const { deps, downloads, done } = run({ fetch: ign.fetch });

    await done;

    expect(deps.alert).toHaveBeenCalledWith("sin sesión");
    expect(downloads).toEqual([]);
  });

  it("si la red falla avisa que no pudo", async () => {
    const { deps, downloads, done } = run({ fetch: vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) });

    await done;

    expect(deps.alert).toHaveBeenCalledWith("falló");
    expect(downloads).toEqual([]);
  });

  it("una lista vacía avisa y no baja nada", async () => {
    const empty = { data: { searchLibrary: { pageInfo: { hasNext: false, nextCursor: null, total: 0 }, libraryObjects: [] } } };
    const ign = fakeIgn({ library: [empty] });
    const { deps, downloads, done } = run({ fetch: ign.fetch });

    await done;

    expect(deps.alert).toHaveBeenCalledWith("lista vacía");
    expect(downloads).toEqual([]);
  });
});

describe("buildIgnBookmarklet", () => {
  it("es un javascript: que corre solo, sin nada de Ludoteca alrededor", async () => {
    const bookmarklet = buildIgnBookmarklet(MESSAGES);
    const source = decodeURIComponent(bookmarklet.slice("javascript:".length));
    const ign = fakeIgn();
    const downloads: string[] = [];
    // Un navegador mínimo: lo único que el marcador puede usar es lo que recibe acá.
    const browser = {
      fetch: ign.fetch,
      location: { hostname: "www.ign.com" },
      alert: vi.fn(),
    };
    const documentStub = {
      body: { append: vi.fn() },
      createElement: () => ({ click: () => downloads.push("click"), remove: vi.fn(), href: "", download: "" }),
    };
    const urlStub = { createObjectURL: () => "blob:ign", revokeObjectURL: vi.fn() };

    // El test corre el texto del marcador como lo correría el navegador en la pestaña de IGN.
    // eslint-disable-next-line sonarjs/code-eval
    await new Function("window", "document", "URL", "Blob", `return ${source.replace(/^void /, "")}`)(browser, documentStub, urlStub, Blob);

    expect(bookmarklet.startsWith("javascript:")).toBe(true);
    expect(downloads).toEqual(["click"]);
    expect(new Set(ign.requests.map((request) => request.url))).toEqual(new Set([IGN_API_URL]));
  });
});

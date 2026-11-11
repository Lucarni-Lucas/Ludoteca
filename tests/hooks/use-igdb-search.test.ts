import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIgdbSearch } from "@/hooks/use-igdb-search";

const RESULT = { igdbId: 1, baseIgdbId: 1, title: "Hades", year: 2020, coverUrl: null, mark: { kind: "new" } };
const DEBOUNCE_MS = 300;

function mockFetch(body: unknown = { ok: true, data: [RESULT] }) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useIgdbSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("no busca con una sola letra", async () => {
    const fetchMock = mockFetch();
    const { result } = renderHook(() => useIgdbSearch());

    act(() => result.current.setQuery("h"));
    await advance(DEBOUNCE_MS);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.tooShort).toBe(true);
  });

  it("espera a que se deje de escribir antes de buscar", async () => {
    const fetchMock = mockFetch();
    const { result } = renderHook(() => useIgdbSearch());

    act(() => result.current.setQuery("ha"));
    await advance(DEBOUNCE_MS - 1);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
  });

  it("devuelve los resultados", async () => {
    mockFetch();
    const { result } = renderHook(() => useIgdbSearch());

    act(() => result.current.setQuery("hades"));
    await advance(DEBOUNCE_MS);

    expect(result.current.results).toEqual([RESULT]);
    expect(result.current.loading).toBe(false);
  });

  it("codifica el texto en la URL", async () => {
    const fetchMock = mockFetch();
    const { result } = renderHook(() => useIgdbSearch());

    act(() => result.current.setQuery("a&b"));
    await advance(DEBOUNCE_MS);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/igdb/search?q=a%26b");
  });

  it("cancela el pedido anterior al seguir escribiendo", async () => {
    const fetchMock = mockFetch();
    const { result } = renderHook(() => useIgdbSearch());
    act(() => result.current.setQuery("ha"));
    await advance(DEBOUNCE_MS);
    const signal = fetchMock.mock.calls[0][1]?.signal;

    act(() => result.current.setQuery("had"));

    expect(signal?.aborted).toBe(true);
  });

  it("avisa cuando no hay resultados", async () => {
    mockFetch({ ok: true, data: [] });
    const { result } = renderHook(() => useIgdbSearch());

    act(() => result.current.setQuery("zzz"));
    await advance(DEBOUNCE_MS);

    expect(result.current.noResults).toBe(true);
  });

  it("muestra el mensaje de error del servidor", async () => {
    mockFetch({ ok: false, error: { code: "IGDB_UNAVAILABLE", message: "No pudimos consultar IGDB." } });
    const { result } = renderHook(() => useIgdbSearch());

    act(() => result.current.setQuery("hades"));
    await advance(DEBOUNCE_MS);

    expect(result.current.errorMessage).toBe("No pudimos consultar IGDB.");
    expect(result.current.noResults).toBe(false);
  });

  it("no muestra resultados viejos para un texto nuevo", async () => {
    mockFetch();
    const { result } = renderHook(() => useIgdbSearch());
    act(() => result.current.setQuery("hades"));
    await advance(DEBOUNCE_MS);

    act(() => result.current.setQuery("celeste"));

    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

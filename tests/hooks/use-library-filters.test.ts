import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLibraryFilters } from "@/hooks/use-library-filters";
import { type LibraryView, parseLibraryView, serializeLibraryView } from "@/model/game/filter-params";
import { NO_FILTERS } from "@/model/game/filters";

function setUrl(search: string): void {
  window.history.replaceState(null, "", `/library${search}`);
}

describe("useLibraryFilters", () => {
  beforeEach(() => {
    setUrl("");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lee los filtros de la URL", () => {
    setUrl("?group=finished&q=civ&sort=score");

    const { result } = renderHook(() => useLibraryFilters(""));

    expect(result.current.filters.groups).toEqual(["finished"]);
    expect(result.current.filters.title).toBe("civ");
    expect(result.current.sort).toBe("score");
  });

  it("escribe los filtros en la URL sin navegar", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() => useLibraryFilters(""));

    act(() => result.current.setFilters({ storeIds: ["steam"] }));

    expect(replaceState).toHaveBeenCalledOnce();
    expect(window.location.search).toBe("?store=steam");
    expect(result.current.filters.storeIds).toEqual(["steam"]);
  });

  it("conserva los demás filtros al cambiar uno", () => {
    setUrl("?group=finished");
    const { result } = renderHook(() => useLibraryFilters(""));

    act(() => result.current.setFilters({ title: "hades" }));

    expect(result.current.filters.groups).toEqual(["finished"]);
    expect(result.current.filters.title).toBe("hades");
  });

  it("deja la URL limpia al sacar todos los filtros", () => {
    setUrl("?store=steam");
    const { result } = renderHook(() => useLibraryFilters(""));

    act(() => result.current.clearFilters());

    expect(window.location.search).toBe("");
    expect(result.current.filters).toEqual(NO_FILTERS);
  });

  it("limpiar conserva el orden y «Mostrar sin interés»", () => {
    setUrl("?store=steam&sort=title&hidden=1");
    const { result } = renderHook(() => useLibraryFilters(""));

    act(() => result.current.clearFilters());

    expect(result.current.sort).toBe("title");
    expect(result.current.filters.showNotInterested).toBe(true);
    expect(result.current.filters.storeIds).toEqual([]);
  });

  it("cambia el orden", () => {
    const { result } = renderHook(() => useLibraryFilters(""));

    act(() => result.current.setSort("duration"));

    expect(window.location.search).toBe("?sort=duration");
    expect(result.current.sort).toBe("duration");
  });

  it("reacciona cuando el navegador vuelve atrás", () => {
    const { result } = renderHook(() => useLibraryFilters(""));

    act(() => {
      setUrl("?q=celeste");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(result.current.filters.title).toBe("celeste");
  });
});

describe("parámetros de la URL", () => {
  it("ida y vuelta con todos los filtros", () => {
    const view: LibraryView = {
      filters: {
        statusIds: ["a", "b"],
        groups: ["dropped"],
        storeIds: ["steam"],
        kinds: ["free", "lost"],
        duration: { min: 3, max: 8 },
        played: { min: 0, max: 0 },
        score: { min: 9, max: null },
        title: "civ vi",
        showNotInterested: true,
      },
      sort: "score",
    };

    const parsed = parseLibraryView(serializeLibraryView(view));

    expect(parsed).toEqual(view);
  });

  it("no agrega nada a la URL sin filtros", () => {
    const view = { filters: NO_FILTERS, sort: "recent" as const };

    const query = serializeLibraryView(view);

    expect(query).toBe("");
  });

  it.each([
    { search: "?group=inventado", check: (view: LibraryView) => view.filters.groups, expected: [] },
    { search: "?kind=robado", check: (view: LibraryView) => view.filters.kinds, expected: [] },
    { search: "?sort=precio", check: (view: LibraryView) => view.sort, expected: "recent" },
    { search: "?dur=abc", check: (view: LibraryView) => view.filters.duration, expected: { min: null, max: null } },
    { search: "?dur=x-y", check: (view: LibraryView) => view.filters.duration, expected: { min: null, max: null } },
    { search: "?score=9-", check: (view: LibraryView) => view.filters.score, expected: { min: 9, max: null } },
    { search: "?hidden=si", check: (view: LibraryView) => view.filters.showNotInterested, expected: false },
  ])("ignora o interpreta «$search» sin romper", ({ search, check, expected }) => {
    const value = search;

    const view = parseLibraryView(value);

    expect(check(view)).toEqual(expected);
  });

  it("descarta solo la opción inválida de una lista", () => {
    const search = "?group=finished,inventado";

    const view = parseLibraryView(search);

    expect(view.filters.groups).toEqual(["finished"]);
  });
});

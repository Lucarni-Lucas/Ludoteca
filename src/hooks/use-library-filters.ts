"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { type LibraryFilters, NO_FILTERS } from "@/model/game/filters";
import { type LibraryView, parseLibraryView, serializeLibraryView } from "@/model/game/filter-params";
import type { LibrarySort } from "@/model/game/sort";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("popstate", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

function getSnapshot(): string {
  return window.location.search;
}

function writeView(view: LibraryView): void {
  const query = serializeLibraryView(view);

  // replaceState y no el router: filtrar es instantáneo y no tiene que ir al servidor.
  window.history.replaceState(window.history.state, "", query ? `?${query}` : window.location.pathname);
  listeners.forEach((listener) => listener());
}

/** `initialSearch` es la query con la que el servidor pintó la página: evita que la hidratación difiera. */
export function useLibraryFilters(initialSearch: string) {
  const search = useSyncExternalStore(subscribe, getSnapshot, () => initialSearch);
  const view = useMemo(() => parseLibraryView(search), [search]);

  const setFilters = useCallback(
    (changes: Partial<LibraryFilters>) => {
      writeView({ ...view, filters: { ...view.filters, ...changes } });
    },
    [view],
  );

  const setSort = useCallback(
    (sort: LibrarySort) => {
      writeView({ ...view, sort });
    },
    [view],
  );

  // Limpiar no toca el orden ni «Mostrar sin interés»: no son filtros de resultados.
  const clearFilters = useCallback(() => {
    writeView({ ...view, filters: { ...NO_FILTERS, showNotInterested: view.filters.showNotInterested } });
  }, [view]);

  return { filters: view.filters, sort: view.sort, setFilters, setSort, clearFilters };
}

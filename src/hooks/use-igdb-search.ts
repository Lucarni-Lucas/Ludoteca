"use client";

import { useEffect, useState } from "react";

import type { MarkedSearchResult } from "@/model/game/add-game";
import type { ActionResult } from "@/shared/action-result";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const SEARCH_FAILED_MESSAGE = "No pudimos consultar IGDB. Probá de nuevo.";

type SearchResponse = Readonly<{
  query: string;
  results: readonly MarkedSearchResult[];
  errorMessage: string | null;
}>;

async function requestResults(query: string, signal: AbortSignal): Promise<SearchResponse | null> {
  try {
    const response = await fetch(`/api/igdb/search?q=${encodeURIComponent(query)}`, { signal });
    const result = (await response.json()) as ActionResult<readonly MarkedSearchResult[]>;

    return result.ok
      ? { query, results: result.data, errorMessage: null }
      : { query, results: [], errorMessage: result.error.message };
  } catch {
    // Un pedido cancelado no es un error: ya hay otro más nuevo en camino.
    return signal.aborted ? null : { query, results: [], errorMessage: SEARCH_FAILED_MESSAGE };
  }
}

export function useIgdbSearch() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;

  useEffect(() => {
    if (tooShort) {
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void requestResults(trimmed, controller.signal).then((next) => {
        if (next) {
          setResponse(next);
        }
      });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, tooShort]);

  // Se deriva en lugar de guardarse: una respuesta vieja nunca se muestra para un texto nuevo.
  const current = !tooShort && response?.query === trimmed ? response : null;

  return {
    query,
    setQuery,
    trimmedQuery: trimmed,
    tooShort,
    loading: !tooShort && current === null,
    results: current?.results ?? [],
    errorMessage: current?.errorMessage ?? null,
    noResults: current !== null && current.errorMessage === null && current.results.length === 0,
  };
}

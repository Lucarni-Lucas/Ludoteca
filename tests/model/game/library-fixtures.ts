import type { Copy } from "@/model/copy/copy";
import type { LibraryGame } from "@/model/game/library-game";
import { DEFAULT_STATUSES, type Status } from "@/model/status/status";

/** Los estados por defecto, usando el `system_key` como id para poder nombrarlos en los tests. */
export const STATUSES: readonly Status[] = DEFAULT_STATUSES.map((value) => ({ ...value, id: value.systemKey ?? "" }));

export function statusByKey(systemKey: string): Status {
  const status = STATUSES.find((candidate) => candidate.systemKey === systemKey);

  if (!status) {
    throw new Error(`Estado de prueba desconocido: ${systemKey}`);
  }

  return status;
}

export function buildCopy(overrides: Partial<Copy> = {}): Copy {
  return {
    id: "copia",
    storeId: "steam",
    storeName: "Steam",
    kind: "purchased",
    acquiredOn: null,
    playtimeMinutes: null,
    familyOwner: null,
    lostAt: null,
    lostReason: null,
    ...overrides,
  };
}

export function buildGame(overrides: Partial<LibraryGame> = {}): LibraryGame {
  return {
    id: "juego",
    catalogGameId: "catalogo",
    igdbId: 1,
    source: "igdb",
    title: "Juego",
    year: 2020,
    developer: null,
    pageUrl: null,
    catalog: { estimatedHours: null, endless: false, coverUrl: null },
    corrections: { estimatedHours: null, endless: null, coverUrl: null },
    status: statusByKey("backlog"),
    statusSince: "2026-01-01",
    score: null,
    notInterested: false,
    addedAt: "2026-01-01T00:00:00.000Z",
    copies: [],
    manualPlayedMinutes: null,
    ...overrides,
  };
}

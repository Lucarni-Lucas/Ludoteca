import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useImportReview } from "@/hooks/use-import-review";
import type { ImportOverview } from "@/service/import/import-service";

import { renderHookWithIntl } from "../i18n/render-with-intl";

const actions = vi.hoisted(() => ({
  confirmImportAction: vi.fn(),
  connectSteamAction: vi.fn(),
  decideAction: vi.fn(),
  getImportOverviewAction: vi.fn(),
  refreshSteamAction: vi.fn(),
  searchAgainAction: vi.fn(),
}));

vi.mock("@/app/(app)/import/actions", () => actions);

const EMPTY: ImportOverview = {
  review: { groups: [], upToDate: 0, excluded: 0, pendingCount: 0, itemCount: 0 },
  ready: { games: 0, copies: 0 },
  sources: [],
  steam: { configured: true, accountId: null },
  progress: { done: 0, total: 0 },
};

const LOADED: ImportOverview = {
  ...EMPTY,
  sources: [{ source: "ign", itemCount: 303, lastReadOn: "2026-11-23" }],
  progress: { done: 0, total: 303 },
};

function respond(body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body))));
}

describe("useImportReview", () => {
  beforeEach(() => {
    Object.values(actions).forEach((action) => action.mockReset());
    actions.getImportOverviewAction.mockResolvedValue({ ok: true, data: LOADED });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("subir un archivo dice cuántos juegos leyó y trae la revisión", async () => {
    respond({ ok: true, data: { source: "ign", read: 303, skipped: 0 } });
    const { result } = renderHookWithIntl(() => useImportReview(EMPTY));

    let loaded: ImportOverview | null = null;
    await act(async () => {
      loaded = await result.current.uploadFile("ign", new File(["{}"], "ign.json"));
    });

    expect(loaded).toEqual(LOADED);
    expect(result.current.feedback.ign).toEqual({ kind: "ok", message: "Leímos 303 juegos." });
    expect(result.current.overview.sources[0].itemCount).toBe(303);
  });

  it("cuenta los juegos sin tienda que no se leyeron", async () => {
    respond({ ok: true, data: { source: "playnite", read: 231, skipped: 2 } });
    const { result } = renderHookWithIntl(() => useImportReview(EMPTY));

    await act(() => result.current.uploadFile("playnite", new File(["{}"], "playnite.json")));

    expect(result.current.feedback.playnite?.message).toBe("Leímos 231 juegos. 2 juegos sin tienda no se leyeron.");
  });

  it("Archivo desconocido", async () => {
    respond({ ok: false, error: { code: "UNKNOWN_IMPORT_FILE", message: "No reconozco este archivo." } });
    const { result } = renderHookWithIntl(() => useImportReview(EMPTY));

    await act(() => result.current.uploadFile("ign", new File(["x"], "otro.json")));

    expect(result.current.feedback.ign).toEqual({ kind: "error", message: "No reconozco este archivo." });
    expect(actions.getImportOverviewAction).not.toHaveBeenCalled();
  });

  it("sin red muestra el texto genérico", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const { result } = renderHookWithIntl(() => useImportReview(EMPTY));

    await act(() => result.current.uploadFile("ign", new File(["{}"], "ign.json")));

    expect(result.current.feedback.ign?.kind).toBe("error");
  });

  it("Perfil privado", async () => {
    const message = "Tus juegos de Steam son privados. En Steam, andá a tu perfil › Editar perfil › Privacidad y poné «Detalles del juego» como Público.";
    actions.connectSteamAction.mockResolvedValue({ ok: false, error: { code: "STEAM_GAMES_PRIVATE", message } });
    const { result } = renderHookWithIntl(() => useImportReview(EMPTY));

    await act(() => result.current.connectSteam("76561197960287930"));

    expect(result.current.feedback.steam).toEqual({ kind: "error", message });
  });

  it("Perfil público", async () => {
    actions.connectSteamAction.mockResolvedValue({ ok: true, data: { accountId: "76561197960287930", read: 412 } });
    const { result } = renderHookWithIntl(() => useImportReview(EMPTY));

    await act(() => result.current.connectSteam("76561197960287930"));

    expect(result.current.feedback.steam).toEqual({ kind: "ok", message: "Trajimos 412 juegos de Steam." });
  });

  it("decidir guarda la revisión que devuelve el servidor", async () => {
    actions.decideAction.mockResolvedValue({ ok: true, data: LOADED });
    const { result } = renderHookWithIntl(() => useImportReview(EMPTY));

    let saved: unknown = null;
    await act(async () => {
      saved = await result.current.decide(["entrada"], { kind: "choose", choice: { kind: "keep" } });
    });

    expect(saved).toEqual(LOADED);
    expect(actions.decideAction).toHaveBeenCalledWith(["entrada"], { kind: "choose", choice: { kind: "keep" } });
    expect(result.current.overview).toEqual(LOADED);
  });

  it("confirmar guarda el resumen", async () => {
    const summary = { games: 480, copies: 520, hidden: 60, excluded: 4 };
    actions.confirmImportAction.mockResolvedValue({ ok: true, data: summary });
    const { result } = renderHookWithIntl(() => useImportReview(LOADED));

    await act(() => result.current.confirm());

    await waitFor(() => expect(result.current.summary).toEqual(summary));
  });
});

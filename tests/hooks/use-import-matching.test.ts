import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RATE_LIMIT_RETRY_MS, useImportMatching } from "@/hooks/use-import-matching";

const { advanceMatchingAction } = vi.hoisted(() => ({ advanceMatchingAction: vi.fn() }));

vi.mock("@/app/(app)/import/actions", () => ({ advanceMatchingAction }));

const rateLimit = { ok: false, error: { code: "IGDB_RATE_LIMIT", message: "IGDB está recibiendo muchas consultas." } } as const;
const unavailable = { ok: false, error: { code: "IGDB_UNAVAILABLE", message: "No pudimos consultar IGDB." } } as const;

function progress(done: number, total = 180) {
  return { ok: true, data: { done, total } } as const;
}

describe("useImportMatching", () => {
  beforeEach(() => {
    advanceMatchingAction.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("el progreso avanza tanda por tanda hasta terminar", async () => {
    advanceMatchingAction.mockResolvedValueOnce(progress(60)).mockResolvedValueOnce(progress(120)).mockResolvedValueOnce(progress(180));
    const onFinished = vi.fn();

    const { result } = renderHook(() => useImportMatching({ initial: { done: 0, total: 180 }, onFinished }));

    await waitFor(() => expect(result.current.progress).toEqual({ done: 180, total: 180 }));
    expect(advanceMatchingAction).toHaveBeenCalledTimes(3);
    expect(onFinished).toHaveBeenCalledOnce();
    expect(result.current.running).toBe(false);
  });

  it("se retoma al volver a montar, desde lo que ya cruzó", async () => {
    advanceMatchingAction.mockResolvedValue(progress(180));

    const { result } = renderHook(() => useImportMatching({ initial: { done: 120, total: 180 }, onFinished: vi.fn() }));

    expect(result.current.progress).toEqual({ done: 120, total: 180 });
    await waitFor(() => expect(result.current.progress.done).toBe(180));
    expect(advanceMatchingAction).toHaveBeenCalledOnce();
  });

  it("sin filas pendientes no llama al servidor", () => {
    const initial = { done: 50, total: 50 };

    const { result } = renderHook(() => useImportMatching({ initial, onFinished: vi.fn() }));

    expect(result.current.running).toBe(false);
    expect(advanceMatchingAction).not.toHaveBeenCalled();
  });

  it("reintenta una vez un 429 después de 2 s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    advanceMatchingAction.mockResolvedValueOnce(rateLimit).mockResolvedValueOnce(progress(180));

    const { result } = renderHook(() => useImportMatching({ initial: { done: 0, total: 180 }, onFinished: vi.fn() }));
    await waitFor(() => expect(advanceMatchingAction).toHaveBeenCalledOnce());
    await act(() => vi.advanceTimersByTimeAsync(RATE_LIMIT_RETRY_MS));

    await waitFor(() => expect(result.current.progress.done).toBe(180));
    expect(advanceMatchingAction).toHaveBeenCalledTimes(2);
    expect(result.current.errorMessage).toBeNull();
  });

  it("con dos 429 seguidos muestra el error y deja reintentar", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    advanceMatchingAction.mockResolvedValueOnce(rateLimit).mockResolvedValueOnce(rateLimit).mockResolvedValueOnce(progress(180));

    const { result } = renderHook(() => useImportMatching({ initial: { done: 0, total: 180 }, onFinished: vi.fn() }));
    await act(() => vi.advanceTimersByTimeAsync(RATE_LIMIT_RETRY_MS));
    await waitFor(() => expect(result.current.errorMessage).toBe(rateLimit.error.message));
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.progress.done).toBe(180));
    expect(advanceMatchingAction).toHaveBeenCalledTimes(3);
  });

  it("otro error no se reintenta solo", async () => {
    advanceMatchingAction.mockResolvedValue(unavailable);

    const { result } = renderHook(() => useImportMatching({ initial: { done: 0, total: 10 }, onFinished: vi.fn() }));

    await waitFor(() => expect(result.current.errorMessage).toBe(unavailable.error.message));
    expect(advanceMatchingAction).toHaveBeenCalledOnce();
  });

  it("un archivo nuevo vuelve a arrancar el cruce", async () => {
    advanceMatchingAction.mockResolvedValue(progress(300, 300));
    const { result } = renderHook(() => useImportMatching({ initial: { done: 50, total: 50 }, onFinished: vi.fn() }));

    act(() => result.current.restart({ done: 50, total: 300 }));

    await waitFor(() => expect(result.current.progress).toEqual({ done: 300, total: 300 }));
  });
});

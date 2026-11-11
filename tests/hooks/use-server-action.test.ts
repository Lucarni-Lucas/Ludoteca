import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useServerAction } from "@/hooks/use-server-action";
import type { ActionResult } from "@/shared/action-result";

describe("useServerAction", () => {
  it("empieza sin estar pendiente y sin error", () => {
    const action = vi.fn(async () => ({ ok: true as const, data: 1 }));

    const { result } = renderHook(() => useServerAction(action));

    expect(result.current.pending).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it("queda pendiente mientras la acción no termina", async () => {
    const { promise, resolve } = Promise.withResolvers<ActionResult<string>>();
    const action = vi.fn(() => promise);
    const { result } = renderHook(() => useServerAction(action));

    act(() => {
      void result.current.run();
    });

    await waitFor(() => expect(result.current.pending).toBe(true));
    await act(async () => resolve({ ok: true, data: "listo" }));
    expect(result.current.pending).toBe(false);
  });

  it("devuelve el dato cuando la acción sale bien", async () => {
    const action = vi.fn(async (value: number) => ({ ok: true as const, data: value * 2 }));
    const { result } = renderHook(() => useServerAction(action));

    let outcome: ActionResult<number> | undefined;
    await act(async () => {
      outcome = await result.current.run(21);
    });

    expect(outcome).toEqual({ ok: true, data: 42 });
    expect(result.current.errorMessage).toBeNull();
  });

  it("muestra el mensaje de error cuando falla", async () => {
    const action = vi.fn(async () => ({
      ok: false as const,
      error: { code: "X", message: "No pudimos guardar." },
    }));
    const { result } = renderHook(() => useServerAction(action));

    let outcome: ActionResult<unknown> | undefined;
    await act(async () => {
      outcome = await result.current.run();
    });

    expect(outcome?.ok).toBe(false);
    expect(result.current.errorMessage).toBe("No pudimos guardar.");
  });

  it("borra el error anterior al volver a correr", async () => {
    const action = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: { code: "X", message: "Error" } })
      .mockResolvedValueOnce({ ok: true, data: 1 });
    const { result } = renderHook(() => useServerAction<[], number>(action));

    await act(async () => {
      await result.current.run();
    });
    await act(async () => {
      await result.current.run();
    });

    expect(result.current.errorMessage).toBeNull();
  });
});

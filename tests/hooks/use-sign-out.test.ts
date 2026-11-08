import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type SignOutAction, useSignOut } from "@/hooks/use-sign-out";

import { deferredAction } from "./deferred-action";

const failure = { ok: false, error: { code: "SIGN_OUT_FAILED", message: "No pudimos cerrar la sesión." } } as const;

describe("useSignOut", () => {
  it("queda pendiente mientras la acción no termina", async () => {
    const { action, finish } = deferredAction<[]>(failure);
    const { result } = renderHook(() => useSignOut(action));

    act(() => result.current.signOut());

    await waitFor(() => expect(result.current.pending).toBe(true));
    expect(action).toHaveBeenCalledOnce();
    await finish();
  });

  it("muestra el mensaje y permite reintentar cuando la acción falla", async () => {
    const action = vi.fn<SignOutAction>().mockResolvedValue(failure);
    const { result } = renderHook(() => useSignOut(action));

    act(() => result.current.signOut());

    await waitFor(() => {
      expect(result.current.errorMessage).toBe(failure.error.message);
      expect(result.current.pending).toBe(false);
    });
  });
});

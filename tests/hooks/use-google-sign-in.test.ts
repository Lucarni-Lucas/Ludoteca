import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type GoogleSignInAction, useGoogleSignIn } from "@/hooks/use-google-sign-in";

import { deferredAction } from "./deferred-action";

const failure = { ok: false, error: { code: "SIGN_IN_FAILED", message: "No pudimos iniciar sesión." } } as const;

function renderSignIn(action: GoogleSignInAction, initialErrorMessage: string | null = null) {
  return renderHook(() => useGoogleSignIn({ action, next: "/games/1", initialErrorMessage }));
}

describe("useGoogleSignIn", () => {
  it("le pasa a la acción la pantalla pedida", async () => {
    const action = vi.fn<GoogleSignInAction>().mockResolvedValue(failure);
    const { result } = renderSignIn(action);

    act(() => result.current.signIn());

    await waitFor(() => expect(action).toHaveBeenCalledWith({ next: "/games/1" }));
    await waitFor(() => expect(result.current.pending).toBe(false));
  });

  it("queda pendiente mientras la acción no termina", async () => {
    const { action, finish } = deferredAction<[{ next?: string }]>(failure);
    const { result } = renderSignIn(action);

    act(() => result.current.signIn());

    await waitFor(() => expect(result.current.pending).toBe(true));
    await finish();
  });

  it("muestra el mensaje y permite reintentar cuando la acción falla", async () => {
    const action = vi.fn<GoogleSignInAction>().mockResolvedValue(failure);
    const { result } = renderSignIn(action);

    act(() => result.current.signIn());

    await waitFor(() => {
      expect(result.current.errorMessage).toBe(failure.error.message);
      expect(result.current.pending).toBe(false);
    });
  });

  it("borra el error de la URL al intentar de nuevo", async () => {
    const { action, finish } = deferredAction<[{ next?: string }]>(failure);
    const { result } = renderSignIn(action, "Esta cuenta no tiene acceso a Ludoteca");

    act(() => result.current.signIn());

    await waitFor(() => expect(result.current.errorMessage).toBeNull());
    await finish();
  });
});

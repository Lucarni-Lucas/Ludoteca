import { act } from "@testing-library/react";
import { vi } from "vitest";

import type { ActionFailure } from "@/shared/action-result";

/**
 * Una Server Action que termina cuando el test lo pide. Siempre hay que llamar a `finish`:
 * React comparte entre todas las transiciones el estado de las asíncronas, y una promesa
 * que nunca se resuelve dejaría «pendiente» para siempre al test siguiente.
 */
export function deferredAction<Args extends unknown[]>(failure: ActionFailure) {
  const { promise, resolve } = Promise.withResolvers<ActionFailure>();
  const action = vi.fn((..._args: Args) => promise);

  async function finish(): Promise<void> {
    await act(async () => resolve(failure));
  }

  return { action, finish };
}

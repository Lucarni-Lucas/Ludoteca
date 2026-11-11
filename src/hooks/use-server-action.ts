"use client";

import { useCallback, useState } from "react";

import type { ActionResult } from "@/shared/action-result";

export type ServerActionState<Args extends unknown[], T> = Readonly<{
  pending: boolean;
  errorMessage: string | null;
  /** Devuelve el resultado completo: en una acción sin datos, `undefined` no alcanza para saber si salió bien. */
  run: (...args: Args) => Promise<ActionResult<T>>;
  clearError: () => void;
}>;

export function useServerAction<Args extends unknown[], T>(
  action: (...args: Args) => Promise<ActionResult<T>>,
): ServerActionState<Args, T> {
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const run = useCallback(
    async (...args: Args) => {
      setPending(true);
      setErrorMessage(null);

      const result = await action(...args);

      setPending(false);
      setErrorMessage(result.ok ? null : result.error.message);
      return result;
    },
    [action],
  );

  const clearError = useCallback(() => setErrorMessage(null), []);

  return { pending, errorMessage, run, clearError };
}

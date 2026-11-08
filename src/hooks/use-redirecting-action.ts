"use client";

import { useState, useTransition } from "react";

import type { ActionFailure } from "@/shared/action-result";

/**
 * Para las Server Actions que, si salen bien, redirigen y no vuelven: lo único que puede llegar es un fallo.
 * No lleva try/catch a propósito: Next avisa la redirección rechazando la promesa, y atraparla la rompería.
 */
export function useRedirectingAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<ActionFailure>,
  initialErrorMessage: string | null = null,
) {
  const [pending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);

  function run(...args: Args): void {
    setErrorMessage(null);
    startTransition(async () => {
      const failure = await action(...args);
      setErrorMessage(failure.error.message);
    });
  }

  return { pending, errorMessage, run };
}

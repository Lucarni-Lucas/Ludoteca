"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { advanceMatchingAction } from "@/app/(app)/import/actions";
import type { MatchingProgress } from "@/service/import/import-service";

const RATE_LIMIT_CODE = "IGDB_RATE_LIMIT";
// IGDB acepta 4 pedidos por segundo: dos segundos alcanzan para que se libere (design.md §7).
export const RATE_LIMIT_RETRY_MS = 2000;

type MatchingOptions = Readonly<{
  initial: MatchingProgress;
  /** Se llama cuando el cruce termina, para traer la revisión con todo lo cruzado. */
  onFinished: () => void;
  /** Cada tanda que avanza, para mostrar lo que ya cruzó sin esperar al final. */
  onAdvanced?: () => void;
}>;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRunning(progress: MatchingProgress): boolean {
  return progress.done < progress.total;
}

/**
 * Llama a `advanceMatchingAction` mientras queden filas sin cruzar. Al volver a montar la pantalla, retoma
 * con lo que diga el servidor: las tandas ya hechas quedaron guardadas.
 */
export function useImportMatching({ initial, onFinished, onAdvanced }: MatchingOptions) {
  const [progress, setProgress] = useState(initial);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onFinished, onAdvanced });

  useEffect(() => {
    callbacks.current = { onFinished, onAdvanced };
  }, [onFinished, onAdvanced]);

  const running = isRunning(progress) && errorMessage === null;

  useEffect(() => {
    if (!running) {
      return undefined;
    }

    let cancelled = false;

    async function advance(retried: boolean): Promise<void> {
      const result = await advanceMatchingAction();

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        if (result.error.code === RATE_LIMIT_CODE && !retried) {
          await wait(RATE_LIMIT_RETRY_MS);
          return cancelled ? undefined : advance(true);
        }

        setErrorMessage(result.error.message);
        return undefined;
      }

      setProgress(result.data);
      callbacks.current.onAdvanced?.();

      if (!isRunning(result.data)) {
        callbacks.current.onFinished();
      }

      return undefined;
    }

    void advance(false);

    return () => {
      cancelled = true;
    };
  }, [running, progress.done, attempt]);

  const retry = useCallback(() => {
    setErrorMessage(null);
    setAttempt((value) => value + 1);
  }, []);

  /** Un archivo nuevo o Steam suma filas: el cruce vuelve a arrancar. */
  const restart = useCallback((next: MatchingProgress) => {
    setErrorMessage(null);
    setProgress(next);
  }, []);

  return { progress, running, errorMessage, retry, restart };
}

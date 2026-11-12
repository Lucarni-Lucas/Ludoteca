"use client";

import { useEffect, useRef, useState } from "react";

import { type ScoreChangeSource, ScoreInput } from "./ScoreInput";

const SAVE_DELAY_MS = 400;

type ScoreControlProps = Readonly<{
  score: number | null;
  errorMessage: string | null;
  onSave: (score: number | null) => void;
}>;

/** El puntaje de la ficha: `ScoreInput` más el guardado, al soltar la barra o con una espera breve. */
export function ScoreControl({ score, errorMessage, onSave }: ScoreControlProps) {
  const [value, setValue] = useState(score);
  const [previousScore, setPreviousScore] = useState(score);
  const pendingSave = useRef<{ timer: ReturnType<typeof setTimeout>; value: number | null } | null>(null);
  const latestOnSave = useRef(onSave);

  useEffect(() => {
    latestOnSave.current = onSave;
  });

  // Si el puntaje cambia desde afuera (otra pantalla, una actualización), manda lo guardado.
  if (score !== previousScore) {
    setPreviousScore(score);
    setValue(score);
  }

  // Al salir de la ficha, lo que estaba por guardarse se guarda igual.
  useEffect(
    () => () => {
      if (pendingSave.current) {
        clearTimeout(pendingSave.current.timer);
        latestOnSave.current(pendingSave.current.value);
      }
    },
    [],
  );

  function cancelPendingSave(): void {
    if (pendingSave.current) {
      clearTimeout(pendingSave.current.timer);
      pendingSave.current = null;
    }
  }

  function saveNow(next: number | null): void {
    cancelPendingSave();
    onSave(next);
  }

  function saveSoon(next: number | null): void {
    cancelPendingSave();
    pendingSave.current = {
      value: next,
      timer: setTimeout(() => {
        pendingSave.current = null;
        latestOnSave.current(next);
      }, SAVE_DELAY_MS),
    };
  }

  // Mientras se arrastra la barra no se guarda: recién al soltarla.
  const saveBySource: Readonly<Record<ScoreChangeSource, ((next: number | null) => void) | null>> = {
    step: saveSoon,
    text: saveSoon,
    slide: null,
    release: saveNow,
    clear: saveNow,
  };

  function handleChange(next: number | null, source: ScoreChangeSource): void {
    setValue(next);
    saveBySource[source]?.(next);
  }

  return <ScoreInput value={value} errorMessage={errorMessage} onChange={handleChange} />;
}

"use client";

import * as Slider from "@radix-ui/react-slider";
import { useEffect, useRef, useState } from "react";

import controls from "@/components/ui/controls.module.css";
import {
  formatScore,
  MAX_SCORE,
  MIN_SCORE,
  parseScoreText,
  SCORE_STEP,
  scoreLabel,
  stepScore,
} from "@/model/game/score";

import styles from "./ScoreControl.module.css";

const SAVE_DELAY_MS = 400;

type ScoreControlProps = Readonly<{
  score: number | null;
  errorMessage: string | null;
  onSave: (score: number | null) => void;
}>;

function summaryOf(score: number | null): string {
  return score === null ? "Sin puntaje" : `${formatScore(score)} · ${scoreLabel(score)}`;
}

export function ScoreControl({ score, errorMessage, onSave }: ScoreControlProps) {
  const [value, setValue] = useState(score);
  const [draft, setDraft] = useState<string | null>(null);
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

  function step(delta: number): void {
    const next = stepScore(value ?? MIN_SCORE, delta);

    setValue(next);
    setDraft(null);
    saveSoon(next);
  }

  function handleDraft(text: string): void {
    const parsed = parseScoreText(text);

    setDraft(text);

    if (parsed !== null) {
      setValue(parsed);
      saveSoon(parsed);
    }
  }

  function clearScore(): void {
    setValue(null);
    setDraft(null);
    saveNow(null);
  }

  const shown = value === null ? "" : formatScore(value);

  return (
    <section className={styles.section}>
      <h2 className={controls.sectionLabel}>Tu puntaje</h2>
      <div className={styles.row}>
        <button type="button" className={styles.step} aria-label="Bajar 0.1" onClick={() => step(-SCORE_STEP)}>
          −.1
        </button>
        <div className={styles.center}>
          <input
            className={styles.number}
            type="text"
            inputMode="decimal"
            aria-label="Puntaje"
            placeholder="—"
            value={draft ?? shown}
            onChange={(event) => handleDraft(event.target.value)}
            onBlur={() => setDraft(null)}
          />
          <span className={styles.label}>{value === null ? "Sin puntaje" : scoreLabel(value)}</span>
        </div>
        <button type="button" className={styles.step} aria-label="Subir 0.1" onClick={() => step(SCORE_STEP)}>
          +.1
        </button>
      </div>
      <output className={controls.visuallyHidden}>{summaryOf(value)}</output>
      <div className={styles.sliderBlock}>
        <Slider.Root
          className={styles.slider}
          min={MIN_SCORE}
          max={MAX_SCORE}
          step={SCORE_STEP}
          value={[value ?? MIN_SCORE]}
          onValueChange={([next]) => {
            setValue(next);
            setDraft(null);
          }}
          onValueCommit={([next]) => saveNow(next)}
        >
          <Slider.Track className={styles.track}>
            <Slider.Range className={styles.range} />
          </Slider.Track>
          <Slider.Thumb className={styles.thumb} aria-label="Puntaje de 0 a 10" />
        </Slider.Root>
        <span className={styles.scale} aria-hidden="true">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </span>
      </div>
      {value === null ? null : (
        <button type="button" className={`${controls.ghost} ${styles.clear}`} onClick={clearScore}>
          Quitar puntaje
        </button>
      )}
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
    </section>
  );
}

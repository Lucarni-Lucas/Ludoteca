"use client";

import * as Slider from "@radix-ui/react-slider";
import { type CSSProperties, useState } from "react";

import controls from "@/components/ui/controls.module.css";
import {
  formatScore,
  MAX_SCORE,
  MIN_SCORE,
  parseScoreText,
  SCORE_STEP,
  stepScore,
} from "@/model/game/score";

import styles from "./ScoreInput.module.css";

/** De dónde vino el cambio: la ficha guarda distinto según sea un botón, el campo o la barra. */
export type ScoreChangeSource = "step" | "text" | "slide" | "release" | "clear";

type ScoreInputProps = Readonly<{
  value: number | null;
  errorMessage?: string | null;
  onChange: (next: number | null, source: ScoreChangeSource) => void;
}>;

// Solo el número: la etiqueta («Excelente») vuelve en 07 como opción de Ajustes (design.md §11).
function summaryOf(score: number | null): string {
  return score === null ? "Sin puntaje" : formatScore(score);
}

/** Controlado: muestra el puntaje y avisa cada cambio, sin guardar nada. Lo usan la ficha y el formulario de alta. */
export function ScoreInput({ value, errorMessage = null, onChange }: ScoreInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  function step(delta: number): void {
    setDraft(null);
    onChange(stepScore(value ?? MIN_SCORE, delta), "step");
  }

  function handleDraft(text: string): void {
    const parsed = parseScoreText(text);

    setDraft(text);

    if (parsed !== null) {
      onChange(parsed, "text");
    }
  }

  function clearScore(): void {
    setDraft(null);
    onChange(null, "clear");
  }

  const shown = value === null ? "" : formatScore(value);
  // Sin puntaje, la barra queda en 0 hasta el primer toque.
  const sliderStyle = { "--score-p": ((value ?? MIN_SCORE) - MIN_SCORE) / (MAX_SCORE - MIN_SCORE) } as CSSProperties;

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
          {/* Siempre presente, para que el número no salte cuando se define el puntaje. */}
          <span className={styles.label}>{value === null ? "Sin puntaje" : ""}</span>
        </div>
        <button type="button" className={styles.step} aria-label="Subir 0.1" onClick={() => step(SCORE_STEP)}>
          +.1
        </button>
      </div>
      <output className={controls.visuallyHidden}>{summaryOf(value)}</output>
      <div className={styles.sliderBlock}>
        <Slider.Root
          className={styles.slider}
          style={sliderStyle}
          min={MIN_SCORE}
          max={MAX_SCORE}
          step={SCORE_STEP}
          value={[value ?? MIN_SCORE]}
          onValueChange={([next]) => {
            setDraft(null);
            onChange(next, "slide");
          }}
          onValueCommit={([next]) => onChange(next, "release")}
        >
          {/* Sin Slider.Range: el relleno es un gradiente de la barra que termina en el centro del círculo. */}
          <Slider.Track className={styles.track} />
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

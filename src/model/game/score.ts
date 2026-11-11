import { ScoreOutOfRangeError } from "@/model/game/errors";

export const MIN_SCORE = 0;
export const MAX_SCORE = 10;
export const SCORE_STEP = 0.1;

const DECIMAL_FACTOR = 10;

const SCORE_LABELS: ReadonlyArray<readonly [minimum: number, label: string]> = [
  [10, "Obra maestra"],
  [9, "Excelente"],
  [8, "Muy bueno"],
  [7, "Bueno"],
  [6, "Pasable"],
  [5, "Regular"],
  [4, "Flojo"],
  [3, "Malo"],
  [2, "Muy malo"],
  [MIN_SCORE, "Horrible"],
];

function roundToDecimal(value: number): number {
  return Math.round(value * DECIMAL_FACTOR) / DECIMAL_FACTOR;
}

/** El rango se valida antes de redondear: 10.04 no es un puntaje válido aunque redondee a 10.0. */
export function normalizeScore(value: number): number {
  if (Number.isNaN(value) || value < MIN_SCORE || value > MAX_SCORE) {
    throw new ScoreOutOfRangeError();
  }

  return roundToDecimal(value);
}

export function scoreLabel(score: number): string {
  return SCORE_LABELS.find(([minimum]) => score >= minimum)?.[1] ?? "";
}

/** Lo que escribe el usuario en el campo: acepta coma decimal. `null` si todavía no es un puntaje válido. */
export function parseScoreText(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));

  if (text.trim() === "" || Number.isNaN(value) || value < MIN_SCORE || value > MAX_SCORE) {
    return null;
  }

  return roundToDecimal(value);
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}

/** Los botones de ±0.1 frenan en los extremos en lugar de fallar. */
export function stepScore(score: number, delta: number): number {
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, roundToDecimal(score + delta)));
}

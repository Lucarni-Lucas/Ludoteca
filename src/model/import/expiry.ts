/** Días sin tocar la importación después de los que la revisión abierta se descarta (design.md §18). */
export const REVIEW_EXPIRY_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Un día `AAAA-MM-DD` como número de días: sin horas ni zona horaria, la resta es exacta. */
function dayNumber(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date) / MS_PER_DAY;
}

/**
 * Vence si hoy es posterior al último día de actividad más `REVIEW_EXPIRY_DAYS`: tocarla el lunes
 * la deja viva hasta el lunes siguiente inclusive.
 */
export function isReviewExpired(lastActivityDay: string, today: string): boolean {
  return dayNumber(today) - dayNumber(lastActivityDay) > REVIEW_EXPIRY_DAYS;
}

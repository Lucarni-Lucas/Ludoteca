import { ReleaseYearOutOfRangeError } from "@/model/game/errors";

/** No hay videojuegos que cargar de antes. */
export const FIRST_RELEASE_YEAR = 1950;

export type ReleaseYearRange = Readonly<{ min: number; max: number }>;

/** Llega hasta el año que viene, para poder cargar un juego anunciado. Depende de la fecha, por eso no vive en Zod. */
export function releaseYearRange(today: string): ReleaseYearRange {
  const [currentYear] = today.split("-");
  return { min: FIRST_RELEASE_YEAR, max: Number(currentYear) + 1 };
}

/** El año es opcional: vacío queda vacío. */
export function validateReleaseYear(year: number | null, today: string): number | null {
  if (year === null) {
    return null;
  }

  const range = releaseYearRange(today);

  if (!Number.isInteger(year) || year < range.min || year > range.max) {
    throw new ReleaseYearOutOfRangeError(range);
  }

  return year;
}

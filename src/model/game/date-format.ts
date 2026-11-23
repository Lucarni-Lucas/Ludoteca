export type DateParts = Readonly<{ year: number; month: number; day: number }>;

/** Las partes de una fecha `AAAA-MM-DD`, con el mes de 1 a 12. Los nombres los pone cada idioma. */
export function dateParts(date: string): DateParts {
  const [year, month, day] = date.split("-");
  return { year: Number(year), month: Number(month), day: Number(day) };
}

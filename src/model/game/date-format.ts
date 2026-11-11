const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function parts(date: string): Readonly<{ year: string; month: string; day: number }> {
  const [year, month, day] = date.split("-");
  return { year, month: MONTHS[Number(month) - 1], day: Number(day) };
}

// Una tabla propia: Intl en es-AR varía entre Node y navegadores y rompería la hidratación.
export function formatDayMonth(date: string): string {
  const { month, day } = parts(date);
  return `${day} ${month}`;
}

export function formatMonthYear(date: string): string {
  const { year, month } = parts(date);
  return `${month} ${year}`;
}

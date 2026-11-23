import { useTranslations } from "next-intl";

import { dateParts } from "@/model/game/date-format";

type Month = `${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;

/**
 * Las fechas con los nombres de mes y el orden del idioma elegido. Sin `Intl`: en es-AR da distinto
 * en Node y en los navegadores, y rompería la hidratación (design.md §11).
 */
export function useDateFormat() {
  const t = useTranslations("dates");

  function monthName(month: number): string {
    return t(`months.${String(month) as Month}`);
  }

  return {
    dayMonth(date: string): string {
      const { month, day } = dateParts(date);
      return t("dayMonth", { day, month: monthName(month) });
    },
    monthYear(date: string): string {
      const { year, month } = dateParts(date);
      return t("monthYear", { year: String(year), month: monthName(month) });
    },
  };
}

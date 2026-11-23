import { describe, expect, it } from "vitest";

import { useDateFormat } from "@/i18n/dates";

import { renderHookWithIntl } from "./render-with-intl";

describe("useDateFormat", () => {
  it.each([
    { locale: "es", expected: "may 2020" },
    { locale: "en", expected: "May 2020" },
  ] as const)("Fecha de una copia ($locale)", ({ locale, expected }) => {
    const acquiredOn = "2020-05-17";

    const { result } = renderHookWithIntl(() => useDateFormat(), { locale });

    expect(result.current.monthYear(acquiredOn)).toBe(expected);
  });

  it.each([
    { name: "enero en español", locale: "es", date: "2026-01-09", dayMonth: "9 ene", monthYear: "ene 2026" },
    { name: "diciembre en español", locale: "es", date: "2025-12-31", dayMonth: "31 dic", monthYear: "dic 2025" },
    { name: "enero en inglés", locale: "en", date: "2026-01-09", dayMonth: "Jan 9", monthYear: "Jan 2026" },
    { name: "diciembre en inglés", locale: "en", date: "2025-12-31", dayMonth: "Dec 31", monthYear: "Dec 2025" },
    { name: "un día de un dígito no lleva cero", locale: "es", date: "2026-11-06", dayMonth: "6 nov", monthYear: "nov 2026" },
  ] as const)("$name", ({ locale, date, dayMonth, monthYear }) => {
    const value = date;

    const { result } = renderHookWithIntl(() => useDateFormat(), { locale });

    expect(result.current.dayMonth(value)).toBe(dayMonth);
    expect(result.current.monthYear(value)).toBe(monthYear);
  });
});

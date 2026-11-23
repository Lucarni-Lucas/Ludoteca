import { useTranslations } from "next-intl";
import { describe, expect, it } from "vitest";

import { renderHookWithIntl } from "./render-with-intl";

describe("resumen de la biblioteca", () => {
  it.each([
    {
      name: "en plural, en español",
      locale: "es",
      summary: { games: 14, stores: 7, wishlist: 1, lost: 1 },
      expected: "14 juegos en 7 tiendas · 1 en «Quiero jugarlo» · 1 que ya no tenés",
    },
    {
      name: "en singular, en español",
      locale: "es",
      summary: { games: 1, stores: 1, wishlist: 0, lost: 0 },
      expected: "1 juego en 1 tienda · 0 en «Quiero jugarlo» · 0 que ya no tenés",
    },
    {
      name: "en plural, en inglés",
      locale: "en",
      summary: { games: 14, stores: 7, wishlist: 1, lost: 1 },
      expected: "14 games in 7 stores · 1 in “Want to play” · 1 you no longer have",
    },
    {
      name: "en singular, en inglés",
      locale: "en",
      summary: { games: 1, stores: 1, wishlist: 0, lost: 0 },
      expected: "1 game in 1 store · 0 in “Want to play” · 0 you no longer have",
    },
  ] as const)("$name", ({ locale, summary, expected }) => {
    const useSummary = () => useTranslations("library")("summary", summary);

    const { result } = renderHookWithIntl(useSummary, { locale });

    expect(result.current).toBe(expected);
  });
});

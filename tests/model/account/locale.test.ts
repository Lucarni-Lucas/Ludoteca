import { describe, expect, it } from "vitest";

import { browserLocale, htmlLang, resolveLocale } from "@/model/account/locale";

describe("browserLocale", () => {
  it.each([
    { name: "Navegador en español de México", acceptLanguage: "es-MX,es;q=0.9,en;q=0.8", expected: "es" },
    { name: "Navegador en portugués", acceptLanguage: "pt-BR,pt;q=0.9", expected: "en" },
    { name: "Navegador en inglés", acceptLanguage: "en-US,en;q=0.9", expected: "en" },
    { name: "reconoce el español de Latinoamérica (es-419)", acceptLanguage: "es-419", expected: "es" },
    { name: "da inglés si el preferido es portugués aunque siga el español", acceptLanguage: "pt-BR,es;q=0.9", expected: "en" },
    { name: "elige por el q más alto aunque no venga primero", acceptLanguage: "en;q=0.5, fr;q=0.3, es-AR;q=0.8", expected: "es" },
    { name: "a igual q gana el que aparece primero", acceptLanguage: "en;q=0.7,es;q=0.7", expected: "en" },
    { name: "ignora una entrada mal formada y usa las que se entienden", acceptLanguage: "es;q=nada, es-MX;q=0.4", expected: "es" },
  ])("$name", ({ acceptLanguage, expected }) => {
    const header = acceptLanguage;

    const locale = browserLocale(header);

    expect(locale).toBe(expected);
  });

  it.each([undefined, null, "", ";;;", "es;q=abc", "es;q=2", "***", ",,"])(
    "da inglés cuando el encabezado falta, está vacío o no se entiende (%j)",
    (acceptLanguage) => {
      const header = acceptLanguage;

      const locale = browserLocale(header);

      expect(locale).toBe("en");
    },
  );
});

describe("resolveLocale", () => {
  it.each([
    { name: "usa el idioma elegido en la cuenta aunque el navegador esté en otro", chosen: "en", expected: "en" },
    { name: "usa el del navegador cuando la cuenta no eligió", chosen: null, expected: "es" },
  ] as const)("$name", ({ chosen, expected }) => {
    const acceptLanguage = "es-AR,es;q=0.9";

    const locale = resolveLocale(chosen, acceptLanguage);

    expect(locale).toBe(expected);
  });
});

describe("htmlLang", () => {
  it("declara el rioplatense en español y el inglés sin variante", () => {
    const locales = ["es", "en"] as const;

    const langs = locales.map((locale) => htmlLang(locale));

    expect(langs).toEqual(["es-AR", "en"]);
  });
});

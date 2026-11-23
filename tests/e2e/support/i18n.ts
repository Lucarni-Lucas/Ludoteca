import { expect, type Page } from "@playwright/test";
import { createTranslator } from "next-intl";

import { MESSAGES } from "../../../src/i18n/messages.ts";
import type { Locale } from "../../../src/model/account/locale.ts";

type Catalog = Readonly<{ [key: string]: string | Catalog }>;

/** Los specs de idioma comparan con los textos del catálogo del idioma que prueban, no con frases escritas. */
export function translator(locale: Locale) {
  return createTranslator({ locale, messages: MESSAGES[locale] });
}

const en = translator("en");

/** Elige «English» en Ajustes, como lo haría el usuario, y espera la pantalla ya en inglés. */
export async function switchToEnglish(page: Page): Promise<void> {
  await page.goto("/settings/account");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("status")).toHaveText(en("settings.language.updated"));
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
}

/** Carga un juego a mano con la pantalla en inglés y abre su ficha desde la Biblioteca. */
export async function addManualGameInEnglish(page: Page, title: string): Promise<void> {
  await page.goto("/add/manual");
  await page.getByRole("textbox", { name: en("add.form.title") }).fill(title);
  await page.getByRole("button", { name: en("add.form.save") }).click();
  await page.waitForURL("**/library");
  await page.getByRole("link", { name: en("library.card.open", { title }) }).click();
  await page.waitForURL("**/games/**");
}

function flatten(catalog: Catalog, prefix = ""): [string, string][] {
  return Object.entries(catalog).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [[path, value] as [string, string]] : flatten(value, path);
  });
}

const MIN_FRAGMENT_LENGTH = 4;
const MIN_SPANISH_FRAGMENTS = 100;
const VARIABLE = /\{[^{}]*\}/g;

/**
 * Los pedazos de texto fijo de cada mensaje en español que no son iguales en inglés. Los plurales se
 * dejan afuera: sus formas no se pueden partir en pedazos fijos sin reescribir ICU.
 */
export function spanishOnlyFragments(): string[] {
  const english = new Map(flatten(MESSAGES.en));
  const fragments = flatten(MESSAGES.es)
    .filter(([key, text]) => english.get(key) !== text && !text.includes("plural,"))
    .flatMap(([, text]) => text.split(VARIABLE))
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length >= MIN_FRAGMENT_LENGTH);

  const englishTexts = [...english.values()];
  // Un pedazo que también aparece en algún texto en inglés no prueba nada.
  return [...new Set(fragments)].filter((fragment) => !englishTexts.some((text) => text.includes(fragment)));
}

/** Verifica que el texto visible de la pantalla no tenga ningún texto del catálogo en español. */
export async function expectNoSpanish(page: Page, screen: string): Promise<void> {
  const visible = await page.locator("body").innerText();
  const fragments = spanishOnlyFragments();

  const found = fragments.filter((fragment) => visible.includes(fragment));

  // Sin pedazos para buscar, la verificación pasaría siempre.
  expect(fragments.length, "textos del catálogo en español").toBeGreaterThan(MIN_SPANISH_FRAGMENTS);
  expect(found, `textos en español en ${screen}`).toEqual([]);
}

/** Sin desplazamiento horizontal: nada más ancho que la pantalla. */
export async function expectNoHorizontalScroll(page: Page, screen: string): Promise<void> {
  const { scrollWidth, viewportWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(scrollWidth, `desplazamiento horizontal en ${screen}`).toBeLessThanOrEqual(viewportWidth);
}

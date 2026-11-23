import { expect, test } from "@playwright/test";

import { addManualGameInEnglish, expectNoHorizontalScroll, switchToEnglish, translator } from "./support/i18n.ts";
import { signInAsNewAccount } from "./support/session.ts";

const NARROW_VIEWPORT = { width: 360, height: 780 };
const en = translator("en");

test.describe("inglés en pantalla angosta", { tag: ["@i18n", "@mobile"] }, () => {
  test.use({ locale: "es-AR" });

  test("sin desplazamiento horizontal a 360 px en inglés", async ({ page }) => {
    await signInAsNewAccount(page);
    await switchToEnglish(page);
    await addManualGameInEnglish(page, "Cartas del Faro");
    await page.setViewportSize(NARROW_VIEWPORT);

    await expectNoHorizontalScroll(page, "la ficha");

    await page.goto("/library");
    await expectNoHorizontalScroll(page, "la Biblioteca");
    await page.getByRole("button", { name: en("filters.title") }).click();
    await expect(page.getByRole("dialog", { name: en("filters.title") })).toBeVisible();
    await expectNoHorizontalScroll(page, "los filtros del celu");
    await page.keyboard.press("Escape");

    await page.goto("/add");
    await expectNoHorizontalScroll(page, "Agregar juego");
    await page.goto("/add/manual");
    await expectNoHorizontalScroll(page, "Agregar a mano");
    await page.goto("/settings/account");
    await expectNoHorizontalScroll(page, "Ajustes");
  });
});

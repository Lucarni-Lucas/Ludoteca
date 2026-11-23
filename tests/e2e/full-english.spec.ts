import { expect, test } from "@playwright/test";

import { addManualGameInEnglish, expectNoSpanish, switchToEnglish, translator } from "./support/i18n.ts";
import { signInAsNewAccount } from "./support/session.ts";

const en = translator("en");

test.describe("toda la app en inglés", { tag: "@i18n" }, () => {
  // Ingresa con el navegador en español: así lo que se ve en inglés sale de la elección en Ajustes.
  test.use({ locale: "es-AR" });

  test("Pantalla completa en inglés", async ({ page }) => {
    await signInAsNewAccount(page);
    await switchToEnglish(page);
    await addManualGameInEnglish(page, "Cartas del Faro");

    await expect(page.getByRole("heading", { level: 1, name: "Cartas del Faro" })).toBeVisible();
    await expectNoSpanish(page, "la ficha");

    await page.goto("/library");
    await expect(page.getByText("Cartas del Faro")).toBeVisible();
    await expectNoSpanish(page, "la Biblioteca");

    await page.goto("/add");
    await expect(page.getByRole("heading", { level: 1, name: en("add.title") })).toBeVisible();
    await expectNoSpanish(page, "Agregar juego");
  });
});

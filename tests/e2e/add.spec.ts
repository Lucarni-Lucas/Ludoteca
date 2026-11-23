import { expect, test } from "@playwright/test";

import { switchToEnglish, translator } from "./support/i18n.ts";
import { signInAsNewAccount } from "./support/session.ts";

const en = translator("en");

test.describe("agregar en inglés", { tag: "@i18n" }, () => {
  // Ingresa con el navegador en español y pasa a inglés en Ajustes, como el usuario.
  test.use({ locale: "es-AR" });

  test("Formulario sin título", async ({ page }) => {
    await signInAsNewAccount(page);
    await switchToEnglish(page);
    await page.goto("/add/manual");

    await page.getByRole("button", { name: en("add.form.save") }).click();

    await expect(page.getByText(en("validation.titleRequired"))).toBeVisible();
    await expect(page).toHaveURL(/\/add\/manual$/);
    await page.goto("/library");
    await expect(page.getByRole("link", { name: en("library.emptyAction") })).toBeVisible();
  });
});

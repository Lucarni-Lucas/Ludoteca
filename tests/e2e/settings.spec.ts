import { expect, type Page, test } from "@playwright/test";

import { translator } from "./support/i18n.ts";
import { signIn, signInAsNewAccount } from "./support/session.ts";

const es = translator("es");
const en = translator("en");

async function chooseLanguage(page: Page, name: string, notice: string): Promise<void> {
  await page.goto("/settings/account");
  await page.getByRole("button", { name }).click();
  await expect(page.getByRole("status")).toHaveText(notice);
}

test.describe("idioma en Ajustes", { tag: "@i18n" }, () => {
  // Ingresan con el navegador en español, para que el cambio de idioma lo haga la elección y no el navegador.
  test.use({ locale: "es-AR" });

  test("Pasar a inglés", async ({ page }) => {
    const account = await signInAsNewAccount(page);

    await chooseLanguage(page, "English", en("settings.language.updated"));

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1, name: en("settings.title") })).toBeVisible();
    await expect(page.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    // Sigue en la misma pantalla y con la misma sesión.
    await expect(page).toHaveURL(/\/settings\/account$/);
    await expect(page.getByText(account.email)).toBeVisible();
  });

  test("Volver al español", async ({ page }) => {
    await signInAsNewAccount(page);
    await chooseLanguage(page, "English", en("settings.language.updated"));

    await page.getByRole("button", { name: "Español" }).click();

    await expect(page.getByRole("status")).toHaveText(es("settings.language.updated"));
    await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
    await expect(page.getByRole("heading", { level: 1, name: es("settings.title") })).toBeVisible();
  });

  test("elegir el idioma que ya estaba avisa que no cambió nada", async ({ page }) => {
    await signInAsNewAccount(page);

    await chooseLanguage(page, "Español", es("settings.language.unchanged"));

    await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
  });

  test("Otro dispositivo", async ({ page, browser }) => {
    const account = await signInAsNewAccount(page);
    await chooseLanguage(page, "English", en("settings.language.updated"));
    const phone = await browser.newContext({ locale: "es-AR", viewport: { width: 390, height: 844 } });
    const phonePage = await phone.newPage();

    await signIn(phonePage, account);
    await phonePage.goto("/settings/account");

    await expect(phonePage.locator("html")).toHaveAttribute("lang", "en");
    await expect(phonePage.getByRole("heading", { level: 1, name: en("settings.title") })).toBeVisible();
    await phone.close();
  });
});

import { expect, test } from "@playwright/test";

import { translator } from "./support/i18n.ts";

test.describe("idioma del navegador en el ingreso", { tag: "@i18n" }, () => {
  test("Navegador en español de México", async ({ browser }) => {
    const context = await browser.newContext({ locale: "es-MX" });
    const page = await context.newPage();

    await page.goto("/login");

    await expect(page.locator("html")).toHaveAttribute("lang", "es-AR");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(translator("es")("login.title"));
    await expect(page.getByRole("button", { name: translator("es")("login.signIn") })).toBeVisible();
    await context.close();
  });

  test("Navegador en portugués", async ({ browser }) => {
    const context = await browser.newContext({ locale: "pt-BR" });
    const page = await context.newPage();

    await page.goto("/login");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(translator("en")("login.title"));
    await expect(page.getByRole("button", { name: translator("en")("login.signIn") })).toBeVisible();
    await context.close();
  });
});

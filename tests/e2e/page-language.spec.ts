import { expect, test } from "@playwright/test";

import { translator } from "./support/i18n.ts";

test.describe("idioma declarado", () => {
  test("Página en inglés", async ({ browser }) => {
    const english = await browser.newContext({ locale: "en-US" });
    const spanish = await browser.newContext({ locale: "es-AR" });
    const englishPage = await english.newPage();
    const spanishPage = await spanish.newPage();

    await englishPage.goto("/login");
    await spanishPage.goto("/login");

    await expect(englishPage.locator("html")).toHaveAttribute("lang", "en");
    await expect(englishPage.getByRole("heading", { level: 1 })).toHaveText(translator("en")("login.title"));
    await expect(spanishPage.locator("html")).toHaveAttribute("lang", "es-AR");
    await expect(spanishPage.getByRole("heading", { level: 1 })).toHaveText(translator("es")("login.title"));
    await english.close();
    await spanish.close();
  });
});

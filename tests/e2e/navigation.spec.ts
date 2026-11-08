import { expect, test } from "@playwright/test";

import { signIn, signInButton } from "./support/session.ts";

const WIDE_SECTIONS = [
  { label: "Biblioteca", heading: "Tu biblioteca" },
  { label: "¿Lo tengo?", heading: "¿Lo tengo?" },
  { label: "Suscripciones", heading: "Suscripciones" },
  { label: "Tiendas", heading: "Tiendas" },
];

test.describe("navegación", () => {
  test("Encabezado en la PC", { tag: "@desktop" }, async ({ page }) => {
    await signIn(page);
    const menu = page.getByRole("navigation", { name: "Principal" });

    for (const { label, heading } of WIDE_SECTIONS) {
      await menu.getByRole("link", { name: label }).click();

      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(menu.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("link", { name: "Agregar juego" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Ajustes" })).toBeVisible();
      await expect(page.getByRole("searchbox")).toBeVisible();
    }
  });

  test("Navegación en el celu", { tag: "@mobile" }, async ({ page }) => {
    await signIn(page);
    const bar = page.getByRole("navigation", { name: "Secciones" });

    await bar.getByRole("link", { name: "Suscripciones" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Suscripciones" })).toBeVisible();
    await expect(bar.getByRole("link", { name: "Suscripciones" })).toHaveAttribute("aria-current", "page");
    await expect(bar.getByRole("link", { name: "Biblioteca" })).not.toHaveAttribute("aria-current");
    await expect(page.getByRole("navigation", { name: "Principal" })).toBeHidden();
  });

  test("Abrir Ajustes desde el celu", { tag: "@mobile" }, async ({ page }) => {
    await signIn(page);

    await page.getByRole("link", { name: "Ajustes" }).click();

    await page.waitForURL("**/settings/account");
    await expect(page.getByRole("heading", { level: 1, name: "Ajustes" })).toBeVisible();
  });

  test("Estadísticas oculta", async ({ page }) => {
    await signIn(page);

    const statistics = page.getByRole("link", { name: "Estadísticas" });

    await expect(statistics).toHaveCount(0);
  });

  test("Llamado a la acción", async ({ page }) => {
    await signIn(page);

    const invitation = page.getByRole("link", { name: /^Agregá/ });

    await expect(invitation).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/\b(Agrega|Añade)\b/);
  });

  test("el avatar muestra la inicial del usuario", async ({ page }) => {
    await signIn(page);

    const avatar = page.getByRole("link", { name: "Ajustes" });

    await expect(avatar).toHaveText("L");
  });

  test("buscar en el encabezado lleva a ¿Lo tengo? con el texto", { tag: "@desktop" }, async ({ page }) => {
    await signIn(page);

    await page.getByRole("searchbox").fill("Hades");
    await page.keyboard.press("Enter");

    await page.waitForURL("**/check?q=Hades");
    await expect(page.getByRole("heading", { level: 1, name: "¿Lo tengo?" })).toBeVisible();
  });

  test("Cierre de sesión", async ({ page }) => {
    await signIn(page);
    await page.getByRole("link", { name: "Ajustes" }).click();
    await page.waitForURL("**/settings/account");

    await page.getByRole("button", { name: "Cerrar sesión" }).click();

    await expect(signInButton(page)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/login");
    await page.goto("/library");
    await expect(signInButton(page)).toBeVisible();
  });
});

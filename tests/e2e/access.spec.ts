import { expect, type Page, test } from "@playwright/test";

import { ALLOWED_ACCOUNT, OTHER_ACCOUNT } from "./support/constants.ts";
import { chooseGoogleAccount, signIn, signInButton } from "./support/session.ts";

const NOT_ALLOWED_MESSAGE = "Esta cuenta no tiene acceso a Ludoteca";
const PROTECTED_PATHS = ["/", "/library", "/check", "/subscriptions", "/stores", "/add", "/settings/account", "/games/1"];

// Next agrega su propio role="alert" para anunciar los cambios de ruta: hay que filtrar por el texto.
function rejectionAlert(page: Page) {
  return page.getByRole("alert").filter({ hasText: NOT_ALLOWED_MESSAGE });
}

test.describe("acceso", () => {
  test("Acceso sin sesión", async ({ page }) => {
    const paths = PROTECTED_PATHS;

    for (const path of paths) {
      await page.goto(path);

      await expect(signInButton(page), `sin sesión en ${path}`).toBeVisible();
      expect(new URL(page.url()).pathname).toBe("/login");
    }
  });

  test("Ingreso de un usuario permitido", async ({ page }) => {
    await chooseGoogleAccount(ALLOWED_ACCOUNT);
    await page.goto("/login");

    await signInButton(page).click();

    await page.waitForURL("**/library");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.reload();
    expect(new URL(page.url()).pathname).toBe("/library");
  });

  test("Vuelve a la pantalla pedida", async ({ page }) => {
    await chooseGoogleAccount(ALLOWED_ACCOUNT);
    await page.goto("/games/123?tab=diario");
    await expect(signInButton(page)).toBeVisible();

    await signInButton(page).click();

    await page.waitForURL("**/games/123?tab=diario");
    expect(new URL(page.url()).pathname).toBe("/games/123");
  });

  test("Mail no permitido", async ({ page, context }) => {
    await chooseGoogleAccount(OTHER_ACCOUNT);
    await page.goto("/login");

    await signInButton(page).click();

    await expect(rejectionAlert(page)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/login");
    const sessionCookies = (await context.cookies()).filter(({ name }) => /auth-token(\.\d+)?$/.test(name));
    expect(sessionCookies).toEqual([]);
    await page.goto("/library");
    await expect(signInButton(page)).toBeVisible();
  });

  test("muestra el mismo mensaje cuando el rechazo viene del hook de Supabase", async ({ page }) => {
    await chooseGoogleAccount({ ...OTHER_ACCOUNT, rejectWith: NOT_ALLOWED_MESSAGE });
    await page.goto("/login");

    await signInButton(page).click();

    await expect(rejectionAlert(page)).toBeVisible();
  });

  test("con sesión iniciada, la pantalla de ingreso lleva a la Biblioteca", async ({ page }) => {
    await signIn(page);

    await page.goto("/login");

    expect(new URL(page.url()).pathname).toBe("/library");
  });

  test("una URL inexistente muestra la pantalla en español", async ({ page }) => {
    await signIn(page);

    await page.goto("/no-existe");

    await expect(page.getByRole("heading", { name: "No encontramos esa pantalla" })).toBeVisible();
  });
});

import { expect, type Page, request as playwrightRequest } from "@playwright/test";

import { ALLOWED_ACCOUNT, AUTH_URL, SIGN_IN_AS_PATH } from "./constants.ts";

type GoogleAccount = Readonly<{ email: string; name?: string; rejectWith?: string }>;

/** Elige con qué cuenta va a «ingresar» el próximo que pase por el servidor de Auth falso. */
export async function chooseGoogleAccount(account: GoogleAccount): Promise<void> {
  const context = await playwrightRequest.newContext();
  const response = await context.post(`${AUTH_URL}${SIGN_IN_AS_PATH}`, { data: account });
  expect(response.ok()).toBe(true);
  await context.dispose();
}

export function signInButton(page: Page) {
  return page.getByRole("button", { name: "Ingresar con Google" });
}

export async function signIn(page: Page, account: GoogleAccount = ALLOWED_ACCOUNT): Promise<void> {
  await chooseGoogleAccount(account);
  await page.goto("/login");
  await signInButton(page).click();
  await page.waitForURL("**/library");
}

import { expect, type Page, request as playwrightRequest } from "@playwright/test";

import { ALLOW_ACCOUNT_PATH, ALLOWED_ACCOUNT, AUTH_URL, DB_CONTROL_URL, SIGN_IN_AS_PATH } from "./constants.ts";

type GoogleAccount = Readonly<{ email: string; name?: string; rejectWith?: string }>;

let accountCounter = 0;

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

async function allowAccount(email: string): Promise<void> {
  const context = await playwrightRequest.newContext();
  const response = await context.post(`${DB_CONTROL_URL}${ALLOW_ACCOUNT_PATH}?email=${encodeURIComponent(email)}`);
  expect(response.ok()).toBe(true);
  await context.dispose();
}

/** Cada test que escribe datos usa su propia cuenta: los tests no dependen del orden ni comparten estado. */
export async function signInAsNewAccount(page: Page): Promise<GoogleAccount> {
  accountCounter += 1;
  const account = { email: `e2e-${process.pid}-${Date.now()}-${accountCounter}@ludoteca.test`, name: "Cuenta Nueva" };

  await allowAccount(account.email);
  await page.context().clearCookies();
  await signIn(page, account);
  return account;
}

import { expect, type Page, request as playwrightRequest } from "@playwright/test";

import { DATABASE_STATUS_PATH, DB_CONTROL_URL, RESUME_DATABASE_PATH, STALL_DATABASE_PATH } from "./constants.ts";

async function send(path: string): Promise<unknown> {
  const context = await playwrightRequest.newContext();
  const response = await context.post(`${DB_CONTROL_URL}${path}`);
  expect(response.ok()).toBe(true);
  const body = response.status() === 200 ? ((await response.json()) as unknown) : null;
  await context.dispose();
  return body;
}

/**
 * Desde acá, toda conexión que le hable a la base queda sin respuesta, como un socket muerto.
 * Antes espera a que la página termine sus prefetch: uno que quedara a medias se trabaría también
 * y cambiaría lo que el test mide.
 */
export async function stallDatabase(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await send(STALL_DATABASE_PATH);
}

/** Las conexiones que quedaron trabadas siguen trabadas; las nuevas vuelven a andar. */
export async function resumeDatabase(): Promise<void> {
  await send(RESUME_DATABASE_PATH);
}

/** Espera a que un pedido haya llegado a la base trabada: sus datos salen un instante después de hacerlo. */
export async function waitForStuckRequest(): Promise<void> {
  await expect
    .poll(async () => ((await send(DATABASE_STATUS_PATH)) as { frozenConnections: number }).frozenConnections)
    .toBeGreaterThan(0);
}

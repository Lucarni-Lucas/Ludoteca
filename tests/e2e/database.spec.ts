import { expect, test } from "@playwright/test";

import { resumeDatabase, stallDatabase, waitForStuckRequest } from "./support/database.ts";
import { addFromIgdb, gameCard } from "./support/library.ts";
import { signInAsNewAccount } from "./support/session.ts";

// La spec pide avisar en menos de 15 s; la app corta a los 8 s por consulta y a los 5 s por conexión.
const SPEC_LIMIT_MS = 15_000;
// Una ficha con la base sana carga mucho antes de que venza el pedido trabado, a los 8 s.
const HEALTHY_LOAD_MS = 5000;
const TEST_TIMEOUT_MS = 90_000;
const LOAD_ERROR = "No pudimos cargar tus datos. Probá de nuevo.";
const SAVE_ERROR = "No pudimos guardar el cambio. Probá de nuevo.";

test.describe("base que no responde", () => {
  test.describe.configure({ timeout: TEST_TIMEOUT_MS });

  test.afterEach(async () => {
    await resumeDatabase();
  });

  test("Base que no responde al abrir la Biblioteca", async ({ page }) => {
    await signInAsNewAccount(page);
    await stallDatabase(page);
    const started = Date.now();

    await page.goto("/library");

    await expect(page.getByText(LOAD_ERROR)).toBeVisible({ timeout: SPEC_LIMIT_MS });
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
    expect(Date.now() - started).toBeLessThan(SPEC_LIMIT_MS);
  });

  test("Reintentar", async ({ page }) => {
    await signInAsNewAccount(page);
    await addFromIgdb(page, "hades", "Hades");
    await stallDatabase(page);
    await page.goto("/library");
    await expect(page.getByText(LOAD_ERROR)).toBeVisible({ timeout: SPEC_LIMIT_MS });
    await resumeDatabase();

    await page.getByRole("button", { name: "Reintentar" }).click();

    await expect(gameCard(page, "Hades")).toBeVisible({ timeout: SPEC_LIMIT_MS });
  });

  test("Cambio que no se guarda", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "hades", "Hades");
    await page.goto(gamePath);
    await stallDatabase(page);
    const started = Date.now();

    await page.getByRole("button", { name: "Marcar sin interés" }).click();

    await expect(page.getByText(SAVE_ERROR)).toBeVisible({ timeout: SPEC_LIMIT_MS });
    expect(Date.now() - started).toBeLessThan(SPEC_LIMIT_MS);
    await expect(page.getByRole("button", { name: "Marcar sin interés" })).toBeVisible();
    await resumeDatabase();
    await page.reload();
    await expect(page.getByRole("button", { name: "Marcar sin interés" })).toBeVisible({ timeout: SPEC_LIMIT_MS });
  });

  test("Las demás pantallas siguen andando", async ({ page }) => {
    await signInAsNewAccount(page);
    const stuckPath = await addFromIgdb(page, "hades", "Hades");
    const otherPath = await addFromIgdb(page, "outer", "Outer Wilds");
    const stuckPage = await page.context().newPage();
    await stallDatabase(page);
    const stuckRequest = stuckPage.goto(stuckPath).catch(() => undefined);
    await waitForStuckRequest();
    await resumeDatabase();
    const started = Date.now();

    await page.goto(otherPath);

    await expect(page.getByRole("heading", { level: 1, name: "Outer Wilds" })).toBeVisible({ timeout: HEALTHY_LOAD_MS });
    expect(Date.now() - started).toBeLessThan(HEALTHY_LOAD_MS);
    await stuckRequest;
    await stuckPage.close();
  });
});

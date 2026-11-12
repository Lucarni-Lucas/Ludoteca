import { expect, type Page, test } from "@playwright/test";

import { addFromIgdb, gameCard, openIgdbForm, saveIgdbForm } from "./support/library.ts";
import { signInAsNewAccount } from "./support/session.ts";

const NEGATIVE_MESSAGE = "Poné las horas jugadas, de 0 en adelante";

/** «Jugaste» en PC (bloque «Datos») o «X h jugadas» en el encabezado del celu: el que esté a la vista. */
async function expectPlayed(page: Page, hours: string): Promise<void> {
  const isNarrow = (page.viewportSize()?.width ?? 0) < 1024;
  const shown = isNarrow
    ? page.getByText(`${hours} h jugadas`).filter({ visible: true })
    : page.locator("dt", { hasText: "Jugaste" }).locator("xpath=following-sibling::dd[1]").filter({ visible: true });

  await expect(shown.first()).toContainText(`${hours} h`);
}

async function openPlayedDialog(page: Page, label: "Cargar horas" | "Cambiar horas") {
  await page.getByRole("button", { name: label }).filter({ visible: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Horas jugadas" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("horas jugadas a mano", () => {
  test("Cargar las horas en la ficha", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "hades", "Hades");
    await page.goto(gamePath);
    const dialog = await openPlayedDialog(page, "Cargar horas");
    await dialog.getByRole("textbox", { name: "Horas jugadas" }).fill("70");

    await dialog.getByRole("button", { name: "Guardar" }).click();

    await expect(dialog).toBeHidden();
    await expectPlayed(page, "70");
    await page.goto("/library");
    await expect(gameCard(page, "Hades").getByText("70 h")).toBeVisible();
  });

  test("Agregar con horas jugadas", async ({ page }) => {
    await signInAsNewAccount(page);
    const dialog = await openIgdbForm(page, "outer", "Outer Wilds");
    await dialog.getByRole("spinbutton", { name: "Horas jugadas" }).fill("12.5");

    const gamePath = await saveIgdbForm(page, dialog, "Outer Wilds");

    await page.goto(gamePath);
    await expectPlayed(page, "12.5");
  });

  test("Borrar las horas", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "hades", "Hades");
    await page.goto(gamePath);
    const load = await openPlayedDialog(page, "Cargar horas");
    await load.getByRole("textbox", { name: "Horas jugadas" }).fill("70");
    await load.getByRole("button", { name: "Guardar" }).click();
    await expect(load).toBeHidden();
    const change = await openPlayedDialog(page, "Cambiar horas");

    await change.getByRole("button", { name: "Borrar horas" }).click();

    await expect(change).toBeHidden();
    await expectPlayed(page, "0");
  });

  test("Horas negativas", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "hades", "Hades");
    await page.goto(gamePath);
    const dialog = await openPlayedDialog(page, "Cargar horas");
    await dialog.getByRole("textbox", { name: "Horas jugadas" }).fill("-3");

    await dialog.getByRole("button", { name: "Guardar" }).click();

    await expect(dialog.getByText(NEGATIVE_MESSAGE)).toBeVisible();
    await page.reload();
    await expectPlayed(page, "0");
  });
});

test.describe("ayuda de «Duración»", () => {
  test("Ayuda de la duración", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "hades", "Hades");
    await page.goto(gamePath);
    const button = page.getByRole("button", { name: "Qué es «Duración»" }).filter({ visible: true }).first();
    await button.click();
    const text = page
      .getByText("Cuánto se tarda en promedio en terminarlo, según IGDB o lo que cargues vos. No son tus horas jugadas.")
      .filter({ visible: true });
    await expect(text).toHaveCount(1);

    await page.keyboard.press("Escape");

    await expect(text).toHaveCount(0);
    await expect(button).toBeFocused();
  });
});

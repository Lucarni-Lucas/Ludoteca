import { expect, type Locator, type Page, test } from "@playwright/test";

import { addCopy, addFromIgdb, openManualForm } from "./support/library.ts";
import { signInAsNewAccount } from "./support/session.ts";

const MIN_TOUCH_TARGET_PX = 44;

function helpButton(scope: Page | Locator, term: string): Locator {
  return scope.getByRole("button", { name: `Qué es «${term}»` }).filter({ visible: true }).first();
}

/** Abre la ayuda, comprueba su texto y que el «?» mida al menos 44 px, y la cierra con Escape. */
async function expectHelpOpensAndCloses(page: Page, scope: Page | Locator, term: string, text: string): Promise<void> {
  const button = helpButton(scope, term);
  const box = await button.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);

  await button.click();
  // El mismo término puede tener su ayuda en más de un lugar de la página: cuenta la que está a la vista.
  const popover = page.getByText(text, { exact: true }).filter({ visible: true });
  await expect(popover).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(popover).toHaveCount(0);
}

async function openFilters(page: Page): Promise<Page | Locator> {
  const isNarrow = (page.viewportSize()?.width ?? 0) < 1024;

  if (!isNarrow) {
    return page;
  }

  await page.getByRole("button", { name: "Filtros" }).click();
  return page.getByRole("dialog", { name: "Filtros" });
}

test.describe("ayuda «?»", () => {
  test("Cerrar la ayuda", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "hades", "Hades");
    await page.goto(gamePath);
    const button = helpButton(page, "Sin interés");
    await button.click();
    const popover = page.getByText(/Lo tenés pero no pensás jugarlo/);
    await expect(popover).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(popover).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("tocar otra vez el «?» cierra la ayuda", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "hades", "Hades");
    await page.goto(gamePath);
    const button = helpButton(page, "Sin interés");
    await button.click();
    const popover = page.getByText(/Lo tenés pero no pensás jugarlo/);
    await expect(popover).toBeVisible();

    await button.click();

    await expect(popover).toBeHidden();
  });

  test("la ayuda está junto a cada término de la ficha", async ({ page }) => {
    await signInAsNewAccount(page);
    await openManualForm(page);
    await page.getByRole("textbox", { name: "Título" }).fill("Cartas del Faro");
    await page.getByRole("button", { name: "Guardar juego" }).click();
    await page.waitForURL("**/library");
    await page.getByRole("link", { name: /Cartas del Faro/ }).first().click();
    await page.waitForURL("**/games/**");
    const gamePath = new URL(page.url()).pathname;
    await addCopy(page, gamePath, "Steam", "Comprado");

    await expectHelpOpensAndCloses(
      page,
      page,
      "A mano",
      "Lo cargaste vos porque no estaba en IGDB. Solo lo ves vos, y podés vincularlo con IGDB cuando quieras.",
    );
    await expectHelpOpensAndCloses(
      page,
      page,
      "Ya no lo tengo",
      "Ya no tenés esta copia, por ejemplo porque la vendiste o terminó la suscripción. El juego conserva su estado, su puntaje y sus horas.",
    );
    await page.getByRole("button", { name: "Editar", exact: true }).filter({ visible: true }).first().click();
    const edit = page.getByRole("dialog", { name: "Editar" });
    await expectHelpOpensAndCloses(
      page,
      edit,
      "Sin fin",
      "Un juego que no se termina, como un multijugador: no tiene duración estimada.",
    );
    await expect(edit).toBeVisible();
  });

  test("Escape cierra solo la ayuda dentro de una ventana", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "hades", "Hades");
    await page.goto(gamePath);
    await page.getByRole("button", { name: "Agregar otra copia" }).click();
    const dialog = page.getByRole("dialog", { name: "Agregar copia" });

    await expectHelpOpensAndCloses(
      page,
      dialog,
      "Otro",
      "Para lo que no entra en los demás tipos, como un regalo. Cuenta como tuyo.",
    );

    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("la ayuda está en el formulario a mano y en los filtros", async ({ page }) => {
    await signInAsNewAccount(page);
    await openManualForm(page);

    await expectHelpOpensAndCloses(page, page, "Año de lanzamiento", "El año en que salió el juego, no el año en que lo conseguiste.");
    await page.getByRole("button", { name: "Agregar una copia" }).filter({ visible: true }).first().click();
    await expectHelpOpensAndCloses(
      page,
      page,
      "Familia",
      "Te lo presta alguien de tu familia de Steam: lo podés jugar, pero no es tuyo.",
    );

    // Con la biblioteca vacía no hay filtros que mostrar.
    await addFromIgdb(page, "hades", "Hades");
    await page.goto("/library");
    const filters = await openFilters(page);
    await expectHelpOpensAndCloses(
      page,
      filters,
      "Sin interés",
      "Lo tenés pero no pensás jugarlo: no aparece en la biblioteca ni en los conteos. Lo ves con «Mostrar sin interés».",
    );
    await expectHelpOpensAndCloses(
      page,
      filters,
      "Ya no lo tengo",
      "Ya no tenés esta copia, por ejemplo porque la vendiste o terminó la suscripción. El juego conserva su estado, su puntaje y sus horas.",
    );
  });
});

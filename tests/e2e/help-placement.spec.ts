import { expect, type Page, test } from "@playwright/test";

import { addCopy, openManualForm } from "./support/library.ts";
import { signInAsNewAccount } from "./support/session.ts";

// design.md §18: el círculo del «?» queda pegado al término y centrado en altura con él.
const MAX_GAP_PX = 8;
const MAX_VERTICAL_OFFSET_PX = 4;

type Placement = Readonly<{ name: string; gap: number; verticalOffset: number }>;

/**
 * Para cada «?» visible, la distancia entre el final de su término (el nodo anterior, en su último renglón)
 * y el círculo, y la diferencia entre sus centros en altura.
 */
function measurePlacements(page: Page): Promise<Placement[]> {
  return page.getByRole("button", { name: /^Qué es/ }).evaluateAll((buttons) =>
    buttons
      .filter((button) => button.getClientRects().length > 0)
      .map((button) => {
        let term = button.previousSibling;
        while (term && term.nodeType === Node.TEXT_NODE && !term.textContent?.trim()) {
          term = term.previousSibling;
        }
        const range = document.createRange();
        if (term) {
          range.selectNodeContents(term);
        }
        const termRects = term?.nodeType === Node.ELEMENT_NODE ? (term as Element).getClientRects() : range.getClientRects();
        const termBox = termRects[termRects.length - 1];
        const mark = (button.querySelector("[aria-hidden]") ?? button).getBoundingClientRect();
        return {
          name: button.getAttribute("aria-label") ?? "",
          gap: termBox ? mark.left - termBox.right : Number.POSITIVE_INFINITY,
          verticalOffset: termBox
            ? Math.abs(mark.top + mark.height / 2 - (termBox.top + termBox.height / 2))
            : Number.POSITIVE_INFINITY,
        };
      }),
  );
}

async function expectAttached(page: Page, where: string, minimum: number): Promise<void> {
  const placements = await measurePlacements(page);

  const loose = placements.filter(
    ({ gap, verticalOffset }) => gap < 0 || gap > MAX_GAP_PX || verticalOffset > MAX_VERTICAL_OFFSET_PX,
  );

  expect(placements.length, `ayudas en ${where}`).toBeGreaterThanOrEqual(minimum);
  expect(loose, `ayudas sueltas en ${where}`).toEqual([]);
}

test.describe("«?» pegado a su término", () => {
  test("en el formulario, la ficha, «Editar», la ventana de copia y los filtros", async ({ page }) => {
    await signInAsNewAccount(page);
    await openManualForm(page);
    await page.getByRole("button", { name: "Agregar una copia" }).filter({ visible: true }).first().click();
    await expectAttached(page, "el formulario a mano", 4);

    await page.getByRole("button", { name: "Quitar la copia 1" }).filter({ visible: true }).first().click();
    await page.getByRole("textbox", { name: "Título" }).filter({ visible: true }).first().fill("Cartas del Faro");
    await page.getByRole("button", { name: "Guardar juego" }).filter({ visible: true }).first().click();
    await page.waitForURL("**/library");
    await page.getByRole("link", { name: /Cartas del Faro/ }).first().click();
    await page.waitForURL("**/games/**");
    const gamePath = new URL(page.url()).pathname;
    await addCopy(page, gamePath, "Steam", "Comprado");
    await expectAttached(page, "la ficha", 4);

    await page.getByRole("button", { name: "Editar", exact: true }).filter({ visible: true }).first().click();
    await expect(page.getByRole("dialog", { name: "Editar" })).toBeVisible();
    await expectAttached(page, "«Editar»", 2);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Agregar otra copia" }).click();
    await expect(page.getByRole("dialog", { name: "Agregar copia" })).toBeVisible();
    await expectAttached(page, "la ventana de copia", 2);
    await page.keyboard.press("Escape");

    await page.goto("/library");
    if ((page.viewportSize()?.width ?? 0) < 1024) {
      await page.getByRole("button", { name: "Filtros" }).click();
    }
    await expectAttached(page, "los filtros", 4);
  });
});

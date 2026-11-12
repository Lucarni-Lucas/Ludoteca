import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { expect, type Page, test } from "@playwright/test";

import { addFromIgdb } from "./support/library.ts";
import { signInAsNewAccount } from "./support/session.ts";
import { circleCenterX } from "./support/thumb-center.ts";

// La tarea pide menos de 1 px de diferencia con el input nativo del lienzo.
const MAX_DIFFERENCE_PX = 1;
const SCORES = ["0.0", "5.0", "10.0"] as const;

function designFor(page: Page): string {
  const isNarrow = (page.viewportSize()?.width ?? 0) < 768;
  return pathToFileURL(resolve(`design/${isNarrow ? "Movil" : "Escritorio"}-Juego.dc.html`)).href;
}

/** El centro del círculo del input nativo del lienzo, puesto al mismo ancho que la barra de la app. */
async function nativeCenter(page: Page, width: number, score: string): Promise<number> {
  const native = page.locator('input[type="range"]').first();
  await native.evaluate(
    (input, { value, px }) => {
      const range = input as HTMLInputElement;
      range.style.width = `${px}px`;
      range.value = value;
    },
    { value: score, px: width },
  );
  return circleCenterX(native);
}

test.describe("barra del puntaje", () => {
  test("el círculo queda sobre el valor como en el input nativo del lienzo", async ({ page, context }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "hades", "Hades");
    await page.goto(gamePath);
    const slider = page.locator('[role="slider"]').locator("xpath=ancestor::span[contains(@class, 'slider')][1]");
    const design = await context.newPage();
    await design.setViewportSize(page.viewportSize() ?? { width: 1440, height: 900 });
    await design.goto(designFor(page));

    for (const score of SCORES) {
      await page.getByRole("textbox", { name: "Puntaje" }).fill(score);
      await expect(page.getByRole("slider")).toHaveAttribute("aria-valuenow", String(Number(score)));
      const width = (await slider.boundingBox())?.width ?? 0;

      const expected = await nativeCenter(design, width, score);

      // La captura puede salir antes de que se pinte el valor nuevo: se mide hasta que se asiente.
      await expect
        .poll(async () => Math.abs((await circleCenterX(slider)) - expected), { message: `centro del círculo en ${score}` })
        .toBeLessThan(MAX_DIFFERENCE_PX);
    }

    await design.close();
  });
});

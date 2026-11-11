import { expect, test } from "@playwright/test";

import { expectTabOrderAndVisibleFocus, measureInteractive } from "./support/accessibility.ts";
import { addCopy, addFromIgdb, gameCard, openManualForm, resultRow, searchBox } from "./support/library.ts";
import { signInAsNewAccount } from "./support/session.ts";

const MIN_TOUCH_TARGET_PX = 44;
const NARROW_VIEWPORT = { width: 360, height: 740 };
const SLIDER = ['[role="slider"]'];

test.describe("agregar juegos", () => {
  test("Sugerencias desde tres letras", async ({ page }) => {
    await signInAsNewAccount(page);
    await page.goto("/add");

    await searchBox(page).fill("hol");

    await expect(resultRow(page, "Hollow Knight")).toContainText("2017");
    await expect(resultRow(page, "Hollow Knight: Silksong")).toContainText("2025");
  });

  test("Agregar un juego nuevo", async ({ page }) => {
    await signInAsNewAccount(page);

    const gamePath = await addFromIgdb(page, "outer", "Outer Wilds");

    await page.goto(gamePath);
    await expect(page.getByRole("heading", { level: 1, name: "Outer Wilds" })).toBeVisible();
    await expect(page.getByText("2019 · Mobius Digital")).toBeVisible();
    await expect(page.getByText(/unas 17 h · IGDB/).filter({ visible: true })).toBeVisible();
    await page.goto("/library");
    await expect(gameCard(page, "Outer Wilds")).toBeVisible();
  });

  test("Carga mínima", async ({ page }) => {
    await signInAsNewAccount(page);
    await openManualForm(page);

    await page.getByRole("textbox", { name: "Título" }).fill("Cartas del Faro");
    await page.getByRole("button", { name: "Guardar juego" }).click();

    await page.waitForURL("**/library");
    await expect(gameCard(page, "Cartas del Faro").getByText("A MANO")).toBeVisible();
  });
});

test.describe("vista de la biblioteca", () => {
  async function libraryWithScoredGame(page: Parameters<typeof signInAsNewAccount>[0]): Promise<void> {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "hades", "Hades");
    await addCopy(page, gamePath, "Steam", "Comprado");
    await page.goto(gamePath);

    const saved = page.waitForResponse((response) => response.request().method() === "POST");
    await page.getByRole("button", { name: "Subir 0.1" }).click();
    await saved;

    await page.goto("/library");
  }

  test("Grilla en la PC", { tag: "@desktop" }, async ({ page }) => {
    await libraryWithScoredGame(page);

    const card = gameCard(page, "Hades");
    const display = await page
      .locator("article")
      .first()
      .evaluate((element) => getComputedStyle(element.parentElement as HTMLElement).display);

    expect(display).toBe("grid");
    await expect(card.getByText("0.1")).toBeVisible();
    await expect(card.getByText("Pendiente")).toBeVisible();
    await expect(card.getByText("Steam")).toBeVisible();
  });

  test("Lista en el celu", { tag: "@mobile" }, async ({ page }) => {
    await libraryWithScoredGame(page);

    const card = gameCard(page, "Hades");
    const display = await page
      .locator("article")
      .first()
      .evaluate((element) => getComputedStyle(element.parentElement as HTMLElement).display);

    expect(display).toBe("flex");
    await expect(card.getByText("Pendiente")).toBeVisible();
    await expect(card.getByText("Sin empezar")).toBeVisible();
    await expect(card.getByText("Steam")).toBeVisible();
  });
});

test.describe("ficha", () => {
  test("Juego de otro usuario", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "hades", "Hades");

    await signInAsNewAccount(page);
    await page.goto(gamePath);

    await expect(page.getByRole("heading", { name: "No encontramos este juego" })).toBeVisible();
  });

  test("un id mal formado muestra lo mismo que un juego que no existe", async ({ page }) => {
    await signInAsNewAccount(page);

    await page.goto("/games/no-es-un-uuid");

    await expect(page.getByRole("heading", { name: "No encontramos este juego" })).toBeVisible();
  });

  test("Cambio de estado", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "disco", "Disco Elysium");
    await page.goto(gamePath);

    await page.getByRole("button", { name: "Cambiar estado" }).click();
    const dialog = page.getByRole("dialog", { name: "Cambiar estado" });
    await dialog.getByRole("button", { name: "Completado" }).click();
    await dialog.getByRole("button", { name: "Guardar como «Completado»" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText("Completado")).toBeVisible();
    await expect(page.getByText(/Terminado · lo terminaste el/)).toBeVisible();
  });

  test("Segunda copia", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "disco", "Disco Elysium");
    await addCopy(page, gamePath, "Steam", "Comprado");

    await addCopy(page, gamePath, "Nintendo Switch", "Físico");

    await expect(page.getByText("Comprado", { exact: true })).toBeVisible();
    await expect(page.getByText("Físico", { exact: true })).toBeVisible();
    await page.goto("/library");
    await expect(gameCard(page, "Disco Elysium").getByText("Steam")).toBeVisible();
    await expect(gameCard(page, "Disco Elysium").getByText("Nintendo Switch · Físico")).toBeVisible();
  });

  test("Compra de un juego deseado", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "frost", "Frostpunk");

    await addCopy(page, gamePath, "Microsoft Store", "Comprado");

    await expect(page.getByText("Frostpunk pasó a «Pendiente»")).toBeVisible();
    await expect(page.getByText("Sin empezar · desde el", { exact: false })).toBeVisible();
    await expect(page.getByText("Pendiente", { exact: true })).toBeVisible();
  });

  test("Eliminar con confirmación", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "disco", "Disco Elysium");
    await addCopy(page, gamePath, "Steam", "Comprado");

    await page.getByRole("button", { name: "Eliminar copia de Steam" }).click();
    const dialog = page.getByRole("dialog", { name: "Eliminar copia" });
    await dialog.getByRole("button", { name: "Eliminar copia" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Eliminar copia de Steam" })).toHaveCount(0);
  });

  test("Quitar un juego agregado por error", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "outer", "Outer Wilds");
    await addFromIgdb(page, "hades", "Hades");
    await page.goto(gamePath);

    await page.getByRole("button", { name: "Quitar de la biblioteca" }).click();
    await page.getByRole("dialog", { name: "Quitar de la biblioteca" }).getByRole("button", { name: "Quitar" }).click();

    await page.waitForURL("**/library");
    await expect(gameCard(page, "Hades")).toBeVisible();
    await expect(gameCard(page, "Outer Wilds")).toHaveCount(0);
  });
});

test.describe("sin interés", () => {
  test("Ocultar un juego", async ({ page }) => {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "8bit", "8BitMMO");
    await addCopy(page, gamePath, "Steam", "Comprado");

    await page.getByRole("button", { name: "Marcar sin interés" }).click();
    await expect(page.getByRole("button", { name: "Quitar «Sin interés»" })).toBeVisible();

    await page.goto("/library");
    await expect(gameCard(page, "8BitMMO")).toHaveCount(0);
    await expect(page.getByText("0 juegos en 0 tiendas")).toBeVisible();
  });
});

test.describe("accesibilidad de las pantallas con datos", () => {
  async function setupPaths(page: Parameters<typeof signInAsNewAccount>[0]): Promise<readonly string[]> {
    await signInAsNewAccount(page);
    const gamePath = await addFromIgdb(page, "hades", "Hades");
    await addCopy(page, gamePath, "Steam", "Comprado");

    return ["/library", "/add/manual", gamePath];
  }

  test("zona táctil de 44 px con juegos", { tag: "@mobile" }, async ({ page }) => {
    const paths = await setupPaths(page);

    for (const path of paths) {
      await page.goto(path);

      const boxes = await measureInteractive(page, SLIDER);
      const tooSmall = boxes.filter(({ width, height }) => width < MIN_TOUCH_TARGET_PX || height < MIN_TOUCH_TARGET_PX);

      expect(tooSmall, `controles chicos en ${path}`).toEqual([]);
    }
  });

  test("ancho de 360 px con juegos", { tag: "@mobile" }, async ({ page }) => {
    const paths = await setupPaths(page);
    await page.setViewportSize(NARROW_VIEWPORT);

    for (const path of paths) {
      await page.goto(path);

      const { scrollWidth, viewportWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      const boxes = await measureInteractive(page, SLIDER);
      const outside = boxes.filter(({ left, right }) => left < 0 || right > viewportWidth);

      expect(scrollWidth, `desplazamiento horizontal en ${path}`).toBeLessThanOrEqual(viewportWidth);
      expect(outside, `controles fuera de la pantalla en ${path}`).toEqual([]);
    }
  });

  test("recorrido con tabulador con juegos", async ({ page }) => {
    const paths = await setupPaths(page);

    for (const path of paths) {
      await page.goto(path);
      await expectTabOrderAndVisibleFocus(page, path, SLIDER);
    }

    expect(paths).toHaveLength(3);
  });

  test("las ventanas emergentes cumplen la zona táctil y no se salen de la pantalla", { tag: "@mobile" }, async ({ page }) => {
    const [, , gamePath] = await setupPaths(page);
    await page.setViewportSize(NARROW_VIEWPORT);
    await page.goto(gamePath);

    for (const opener of ["Cambiar estado", "Agregar otra copia", "Ya no lo tengo", "Quitar de la biblioteca"]) {
      await page.getByRole("button", { name: opener }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      const boxes = await dialog.locator("a:visible, button:visible, input:visible, select:visible").evaluateAll(
        (elements) =>
          elements.map((element) => {
            const { left, right, width, height } = element.getBoundingClientRect();
            return { label: element.getAttribute("aria-label") ?? element.textContent ?? "", left, right, width, height };
          }),
      );
      const tooSmall = boxes.filter(({ width, height }) => width < MIN_TOUCH_TARGET_PX || height < MIN_TOUCH_TARGET_PX);
      const outside = boxes.filter(({ left, right }) => left < 0 || right > NARROW_VIEWPORT.width);

      expect(tooSmall, `controles chicos en «${opener}»`).toEqual([]);
      expect(outside, `controles fuera de pantalla en «${opener}»`).toEqual([]);

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
  });
});

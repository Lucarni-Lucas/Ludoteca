import { expect, type Page, test } from "@playwright/test";

import { expectTabOrderAndVisibleFocus, measureInteractive } from "./support/accessibility.ts";
import { signIn, signInButton } from "./support/session.ts";

const MIN_TOUCH_TARGET_PX = 44;
const NARROW_VIEWPORT = { width: 360, height: 740 };
const SIGNED_IN_PATHS = ["/library", "/check", "/subscriptions", "/stores", "/add", "/settings/account", "/no-existe"];

async function visitSignedOutThenSignedIn(page: Page, check: (path: string) => Promise<void>): Promise<void> {
  await page.goto("/login");
  await expect(signInButton(page)).toBeVisible();
  await check("/login");

  await signIn(page);
  for (const path of SIGNED_IN_PATHS) {
    await page.goto(path);
    await check(path);
  }
}

test.describe("accesibilidad", () => {
  test("Botón chico", { tag: "@mobile" }, async ({ page }) => {
    await visitSignedOutThenSignedIn(page, async (path) => {
      const boxes = await measureInteractive(page);

      const tooSmall = boxes.filter(({ width, height }) => width < MIN_TOUCH_TARGET_PX || height < MIN_TOUCH_TARGET_PX);

      expect(boxes.length, `controles en ${path}`).toBeGreaterThan(0);
      expect(tooSmall, `controles chicos en ${path}`).toEqual([]);
    });
  });

  test("Pantalla angosta", { tag: "@mobile" }, async ({ page }) => {
    await page.setViewportSize(NARROW_VIEWPORT);

    await visitSignedOutThenSignedIn(page, async (path) => {
      const { scrollWidth, viewportWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      const boxes = await measureInteractive(page);

      const outside = boxes.filter(({ left, right }) => left < 0 || right > viewportWidth);

      expect(scrollWidth, `desplazamiento horizontal en ${path}`).toBeLessThanOrEqual(viewportWidth);
      expect(outside, `controles fuera de la pantalla en ${path}`).toEqual([]);
    });
  });

  test("Recorrido con tabulador", async ({ page }) => {
    await visitSignedOutThenSignedIn(page, (path) => expectTabOrderAndVisibleFocus(page, path));
  });
});

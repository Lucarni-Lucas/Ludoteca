import { expect, type Page, test } from "@playwright/test";

import { signIn, signInButton } from "./support/session.ts";

const INTERACTIVE = "a:visible, button:visible, input:visible";
const MIN_TOUCH_TARGET_PX = 44;
const NARROW_VIEWPORT = { width: 360, height: 740 };
const SIGNED_IN_PATHS = ["/library", "/check", "/subscriptions", "/stores", "/add", "/settings/account", "/no-existe"];

type Box = Readonly<{ label: string; left: number; right: number; width: number; height: number }>;

function measureInteractive(page: Page): Promise<Box[]> {
  return page.locator(INTERACTIVE).evaluateAll((elements) =>
    elements.map((element) => {
      const { left, right, width, height } = element.getBoundingClientRect();
      return { label: element.getAttribute("aria-label") ?? element.textContent ?? element.tagName, left, right, width, height };
    }),
  );
}

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

async function expectTabOrderAndVisibleFocus(page: Page, path: string): Promise<void> {
  const total = await page.locator(INTERACTIVE).evaluateAll((elements) => {
    elements.forEach((element, index) => element.setAttribute("data-tab-order", String(index)));
    return elements.length;
  });
  expect(total, `controles en ${path}`).toBeGreaterThan(0);

  for (let index = 0; index < total; index += 1) {
    await page.keyboard.press("Tab");

    const focused = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement;
      const { outlineStyle, outlineWidth } = getComputedStyle(element);
      return { order: element.dataset.tabOrder, outlineStyle, outlineWidth: Number.parseFloat(outlineWidth) };
    });

    expect(focused.order, `orden del foco en ${path}`).toBe(String(index));
    expect(focused.outlineStyle, `foco visible en ${path}`).not.toBe("none");
    expect(focused.outlineWidth, `foco visible en ${path}`).toBeGreaterThan(0);
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

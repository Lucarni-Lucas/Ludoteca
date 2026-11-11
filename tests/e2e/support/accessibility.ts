import { expect, type Page } from "@playwright/test";

const INTERACTIVE = ["a:visible", "button:visible", "input:visible", "select:visible"];

type Box = Readonly<{ label: string; left: number; right: number; width: number; height: number }>;

function selector(extraControls: readonly string[]): string {
  return [...INTERACTIVE, ...extraControls].join(", ");
}

export function measureInteractive(page: Page, extraControls: readonly string[] = []): Promise<Box[]> {
  return page.locator(selector(extraControls)).evaluateAll((elements) =>
    elements.map((element) => {
      const { left, right, width, height } = element.getBoundingClientRect();
      return { label: element.getAttribute("aria-label") ?? element.textContent ?? element.tagName, left, right, width, height };
    }),
  );
}

export async function expectTabOrderAndVisibleFocus(
  page: Page,
  path: string,
  extraControls: readonly string[] = [],
): Promise<void> {
  const total = await page.locator(selector(extraControls)).evaluateAll((elements) => {
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

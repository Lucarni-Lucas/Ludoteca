import { expect, type Locator, type Page } from "@playwright/test";

export function searchBox(page: Page): Locator {
  return page.getByRole("searchbox", { name: "Buscar juego" });
}

export function resultRow(page: Page, title: string): Locator {
  return page.getByRole("listitem").filter({ has: page.getByText(title, { exact: true }) });
}

/** Agrega un juego del servidor falso de IGDB y devuelve la ruta de su ficha. */
export async function addFromIgdb(page: Page, query: string, title: string): Promise<string> {
  await page.goto("/add");
  await searchBox(page).fill(query);

  const row = resultRow(page, title);
  await row.getByRole("button", { name: "Agregar" }).click();

  const added = row.getByRole("link", { name: "Agregado" });
  await expect(added).toBeVisible();
  return (await added.getAttribute("href")) ?? "";
}

export async function addCopy(page: Page, gamePath: string, store: string, kind: string): Promise<void> {
  await page.goto(gamePath);
  await page.getByRole("button", { name: "Agregar otra copia" }).click();

  const dialog = page.getByRole("dialog", { name: "Agregar copia" });
  await dialog.getByRole("combobox", { name: "Tienda" }).selectOption({ label: store });
  await dialog.getByRole("button", { name: kind, exact: true }).click();
  await dialog.getByRole("button", { name: "Guardar copia" }).click();
  await expect(dialog).toBeHidden();
}

/** En el celu el formulario vive en su propia ruta; desde 768 px está al lado de la búsqueda. */
export async function openManualForm(page: Page): Promise<void> {
  const isNarrow = (page.viewportSize()?.width ?? 0) < 768;
  await page.goto(isNarrow ? "/add/manual" : "/add");
}

export function gameCard(page: Page, title: string): Locator {
  return page.getByRole("article").filter({ has: page.getByText(title, { exact: true }) });
}

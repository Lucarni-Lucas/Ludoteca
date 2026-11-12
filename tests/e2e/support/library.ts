import { expect, type Locator, type Page } from "@playwright/test";

export function searchBox(page: Page): Locator {
  return page.getByRole("searchbox", { name: "Buscar juego" });
}

export function resultRow(page: Page, title: string): Locator {
  return page.getByRole("listitem").filter({ has: page.getByText(title, { exact: true }) });
}

/** Abre el formulario de alta de un juego del servidor falso de IGDB y devuelve la ventana. */
export async function openIgdbForm(page: Page, query: string, title: string): Promise<Locator> {
  await page.goto("/add");
  await searchBox(page).fill(query);
  await resultRow(page, title).getByRole("button", { name: "Agregar" }).click();

  const dialog = page.getByRole("dialog", { name: `Agregar «${title}»` });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Guarda el formulario de alta abierto y devuelve la ruta de la ficha del juego. */
export async function saveIgdbForm(page: Page, dialog: Locator, title: string): Promise<string> {
  await dialog.getByRole("button", { name: "Guardar juego" }).click();

  const added = resultRow(page, title).getByRole("link", { name: "Agregado" });
  await expect(added).toBeVisible();
  return (await added.getAttribute("href")) ?? "";
}

/** Agrega un juego del servidor falso de IGDB sin tocar el formulario y devuelve la ruta de su ficha. */
export async function addFromIgdb(page: Page, query: string, title: string): Promise<string> {
  return saveIgdbForm(page, await openIgdbForm(page, query, title), title);
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

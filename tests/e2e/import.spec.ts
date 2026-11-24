import path from "node:path";

import { expect, type Locator, type Page, test } from "@playwright/test";

import { STEAM_PRIVATE_ID, STEAM_PUBLIC_VANITY } from "./support/constants.ts";
import { expectNoHorizontalScroll, expectNoSpanish, switchToEnglish, translator } from "./support/i18n.ts";
import { gameCard } from "./support/library.ts";
import { signInAsNewAccount } from "./support/session.ts";

const IGN_SAMPLE = path.resolve("tests/adapter/ign/ign-export-sample.json");
const PLAYNITE_SAMPLE = path.resolve("tests/adapter/playnite/playnite-export-sample.json");
const NARROW_WIDTH = 360;
const NARROW_HEIGHT = 800;
const MATCHING_TIMEOUT_MS = 30_000;

const en = translator("en");

function sourceCard(page: Page, name: string): Locator {
  return page.getByRole("article", { name });
}

const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/** Los nombres de grupo llevan «?»: en una expresión regular hay que escaparlo. */
function startsWith(text: string): RegExp {
  const escaped = text.replaceAll(REGEX_SPECIALS, (special) => "\\" + special);
  return new RegExp(`^${escaped}`);
}

function groupButton(page: Page, name: string, navName = "Grupos de la revisión"): Locator {
  return page.getByRole("navigation", { name: navName }).getByRole("button", { name: startsWith(name) });
}

function gameRow(page: Page, title: string): Locator {
  return page.getByRole("listitem").filter({ has: page.getByText(title, { exact: true }) });
}

async function upload(page: Page, source: "IGN" | "Playnite", file: string): Promise<void> {
  await page.getByLabel(`Subir archivo · ${source}`).setInputFiles(file);
  await expect(sourceCard(page, source).getByRole("status")).toContainText("Leímos");
}

/** El cruce termina cuando desaparece la barra de progreso. */
async function waitForMatching(page: Page): Promise<void> {
  await expect(page.getByRole("progressbar")).toHaveCount(0, { timeout: MATCHING_TIMEOUT_MS });
}

async function openGroup(page: Page, name: string): Promise<void> {
  await groupButton(page, name).click();
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
}

async function choose(page: Page, title: string, option: string): Promise<void> {
  await gameRow(page, title).getByRole("radio", { name: option }).click();
  await expect(page.getByRole("status").filter({ hasText: `«${title}» pasó a «Listos»` })).toBeVisible();
}

async function importAllSources(page: Page): Promise<void> {
  await page.goto("/import");
  await upload(page, "IGN", IGN_SAMPLE);
  await upload(page, "Playnite", PLAYNITE_SAMPLE);
  await page.getByLabel("Link de tu perfil o SteamID").fill(`https://steamcommunity.com/id/${STEAM_PUBLIC_VANITY}/`);
  await page.getByRole("button", { name: "Conectar" }).click();
  await expect(sourceCard(page, "Steam").getByRole("status")).toHaveText("Trajimos 4 juegos de Steam.");
  await waitForMatching(page);
}

test.describe("importación", () => {
  test("Biblioteca vacía", async ({ page }) => {
    await signInAsNewAccount(page);

    await page.getByRole("link", { name: "Importar tu biblioteca" }).click();

    await page.waitForURL("**/import");
    await expect(page.getByRole("heading", { level: 1, name: "Importar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ajustes" }).filter({ visible: true }).first()).toHaveAttribute("aria-current", "page");
  });

  test("importar las tres fuentes, decidir, confirmar y ver los juegos en la biblioteca", async ({ page }) => {
    await signInAsNewAccount(page);
    await importAllSources(page);

    await openGroup(page, "Para revisar");
    await choose(page, "Overwatch", "Overwatch (2016)");
    await openGroup(page, "No lo encontré");
    await expect(gameRow(page, "[REDACTED]").getByRole("radio", { name: "No importar" })).toHaveAttribute("aria-checked", "true");
    await choose(page, "Crash Bandicoot", "Cargar a mano");
    await openGroup(page, "¿Es de tu familia?");
    await choose(page, "Portal 2", "Familia");
    await openGroup(page, "¿Es sin fin?");
    await choose(page, "Among Us", "Jugado · sin fin");
    await openGroup(page, "¿Lo vas a jugar alguna vez?");
    await choose(page, "8BitMMO", "Sin interés");
    await openGroup(page, "Elegí un estado");
    await gameRow(page, "Hollow Knight").getByLabel("Estado de Hollow Knight").selectOption({ label: "Jugando" });
    await gameRow(page, "Hollow Knight").getByRole("button", { name: "Aplicar" }).click();
    await expect(page.getByRole("status").filter({ hasText: "«Hollow Knight» pasó a «Listos» con «Jugando»." })).toBeVisible();
    await page.getByRole("checkbox", { name: "Seleccionar los 3" }).click();
    await page.getByRole("group", { name: "Selección" }).getByRole("button", { name: "Pasar a Listos" }).click();
    await expect(page.getByRole("status").filter({ hasText: "3 juegos pasaron a «Listos»." })).toBeVisible();

    await page.getByRole("button", { name: "Confirmar importación" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Entraron" })).toHaveText(
      "Entraron 12 juegos y 8 copias · 1 marcado «Sin interés» · 0 sin importar",
    );
    await page.goto("/library");
    for (const title of ["Hollow Knight", "Celeste", "Portal 2", "Overwatch", "Crash Bandicoot", "60 Seconds!"]) {
      await expect(gameCard(page, title)).toBeVisible();
    }
    await expect(gameCard(page, "8BitMMO")).toHaveCount(0);
    await gameCard(page, "60 Seconds!").getByRole("link", { name: "Ver la ficha de 60 Seconds!" }).click();
    await expect(page.getByText("unas 2.3 h · HowLongToBeat").filter({ visible: true }).first()).toBeVisible();
  });

  test("Retomar la revisión", async ({ page }) => {
    await signInAsNewAccount(page);
    await page.goto("/import");
    await upload(page, "IGN", IGN_SAMPLE);
    await waitForMatching(page);
    await openGroup(page, "¿Es sin fin?");
    await choose(page, "Among Us", "Completado");

    await page.reload();

    await openGroup(page, "Listos");
    await expect(gameRow(page, "Among Us")).toBeVisible();
    await expect(groupButton(page, "¿Es sin fin?")).toContainText("0");
    await page.goto("/library");
    await expect(page.getByText("Todavía no cargaste ningún juego.")).toBeVisible();
  });

  test("Perfil privado", async ({ page }) => {
    await signInAsNewAccount(page);
    await page.goto("/import");

    await page.getByLabel("Link de tu perfil o SteamID").fill(STEAM_PRIVATE_ID);
    await page.getByRole("button", { name: "Conectar" }).click();

    await expect(sourceCard(page, "Steam").getByRole("status")).toContainText("«Detalles del juego» como Público");
    await expect(page.getByLabel("Link de tu perfil o SteamID")).toBeVisible();
  });

  test("Archivo desconocido", async ({ page }) => {
    await signInAsNewAccount(page);
    await page.goto("/import");

    await page.getByLabel("Subir archivo · IGN").setInputFiles({
      name: "otro.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ juegos: [] })),
    });

    await expect(sourceCard(page, "IGN").getByRole("status")).toContainText("No reconozco este archivo");
    await expect(sourceCard(page, "IGN")).toContainText("Todavía no subiste el archivo");
  });

  test("se usa desde 360 px sin desplazamiento horizontal", async ({ page }) => {
    await signInAsNewAccount(page);
    await importAllSources(page);
    await page.setViewportSize({ width: NARROW_WIDTH, height: NARROW_HEIGHT });

    await openGroup(page, "Elegí un estado");

    await expectNoHorizontalScroll(page, "la revisión de la importación");
  });
});

test.describe("importación en inglés", { tag: "@i18n" }, () => {
  // Ingresa con el navegador en español: así lo que se ve en inglés sale de la elección en Ajustes.
  test.use({ locale: "es-AR" });

  test("la pantalla de importar en inglés", async ({ page }) => {
    await signInAsNewAccount(page);
    await switchToEnglish(page);
    await page.goto("/import");
    await page.getByLabel(`${en("import.sources.upload")} · IGN`).setInputFiles(IGN_SAMPLE);
    await expect(sourceCard(page, "IGN").getByRole("status")).toHaveText(en("import.sources.loaded", { count: 9 }));
    await waitForMatching(page);

    await groupButton(page, en("import.groups.endless.name"), en("import.review.nav")).click();

    await expect(page.getByRole("heading", { level: 1, name: en("import.title") })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: en("import.groups.endless.name") })).toBeVisible();
    await expect(gameRow(page, "Among Us").getByRole("radio", { name: en("import.choices.endless") })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("button", { name: en("import.confirm.action") })).toBeVisible();
    await expectNoSpanish(page, "la importación");
  });
});

import path from "node:path";

import { expect, type Locator, type Page, test } from "@playwright/test";

import { STEAM_PRIVATE_ID, STEAM_PUBLIC_VANITY } from "./support/constants.ts";
import { expectNoHorizontalScroll, expectNoSpanish, switchToEnglish, translator } from "./support/i18n.ts";
import { gameCard } from "./support/library.ts";
import { signInAsNewAccount } from "./support/session.ts";

const IGN_SAMPLE = path.resolve("tests/adapter/ign/ign-export-sample.json");
const PLAYNITE_SAMPLE = path.resolve("tests/adapter/playnite/playnite-export-sample.json");
// Castlevania con otro nombre en IGDB, 20XX con otro año y un nombre muy largo (tasks.md 8.10); Fortnite y
// Snakebird Complete también de IGN, Styx con la edición, [REDACTED] y lo que no es un juego (tasks.md 9.6).
const PLAYNITE_REAL_CASES = path.resolve("tests/e2e/support/playnite-real-cases.json");
const IGN_REAL_CASES = path.resolve("tests/e2e/support/ign-real-cases.json");
const NOT_A_GAME = "No se importa · no es un juego";
const LONG_TITLE = "The Legend of Heroes: Trails of Cold Steel IV - The End of Saga - Digital Deluxe Edition with Every Bonus";
const NARROW_WIDTH = 360;
const NARROW_HEIGHT = 800;
const MATCHING_TIMEOUT_MS = 30_000;

const en = translator("en");

function sourceCard(page: Page, name: string): Locator {
  return page.getByRole("article", { name });
}

const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(text: string): string {
  return text.replaceAll(REGEX_SPECIALS, (special) => "\\" + special);
}

/** Los nombres de grupo llevan «?»: en una expresión regular hay que escaparlo. */
function startsWith(text: string): RegExp {
  return new RegExp(`^${escapeRegex(text)}`);
}

function groupButton(page: Page, name: string, navName = "Grupos de la revisión"): Locator {
  return page.getByRole("navigation", { name: navName }).getByRole("button", { name: startsWith(name) });
}

function gameRow(page: Page, title: string): Locator {
  return page.getByRole("listitem").filter({ has: page.getByText(title, { exact: true }) });
}

/** El aviso flotante de cada acción (design.md §15). */
function toast(page: Page, text: string): Locator {
  return page.getByRole("status").filter({ hasText: text });
}

async function upload(page: Page, source: "IGN" | "Playnite", file: string, label = "Subir archivo"): Promise<void> {
  await page.getByLabel(`${label} · ${source}`).setInputFiles(file);
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

/**
 * Toca una respuesta de la fila. Con texto, el nombre entero: «No» no es «No importar». El juego pasa al grupo
 * que le toque, no siempre a «Listos para importar» (tasks.md 10).
 */
async function choose(page: Page, title: string, option: string | RegExp): Promise<void> {
  await gameRow(page, title).getByRole("button", { name: option, exact: true }).click();
  await expect(toast(page, `«${title}» pasó a «`)).toBeVisible();
}

async function importAllSources(page: Page): Promise<void> {
  await page.goto("/import");
  await upload(page, "IGN", IGN_SAMPLE);
  await upload(page, "Playnite", PLAYNITE_SAMPLE);
  await upload(page, "Playnite", PLAYNITE_REAL_CASES, "Subir otro archivo");
  await page.getByLabel("Link de tu perfil o SteamID").fill(`https://steamcommunity.com/id/${STEAM_PUBLIC_VANITY}/`);
  await page.getByRole("button", { name: "Conectar" }).click();
  await expect(sourceCard(page, "Steam").getByRole("status")).toHaveText("Trajimos 4 juegos de Steam.");
  await waitForMatching(page);
}

/** Un candidato de «¿Cuál de estos es?»: su tarjeta dice el nombre completo y el año. */
function candidate(title: string, year: number): RegExp {
  return new RegExp(`^${escapeRegex(title)}\\s*${year}$`);
}

test.describe("importación", () => {
  test("Biblioteca vacía", async ({ page }) => {
    await signInAsNewAccount(page);

    await page.getByRole("link", { name: "Importar tu biblioteca" }).click();

    await page.waitForURL("**/import");
    await expect(page.getByRole("heading", { level: 1, name: "Importar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ajustes" }).filter({ visible: true }).first()).toHaveAttribute("aria-current", "page");
  });

  test("importar las tres fuentes, decidir uno de cada grupo, confirmar y ver los juegos en la biblioteca", async ({ page }) => {
    await signInAsNewAccount(page);
    await importAllSources(page);

    await openGroup(page, "¿Cuál de estos es?");
    await expect(gameRow(page, "Crash Bandicoot")).toContainText("En IGN: Crash Bandicoot · 1996");
    await expect(gameRow(page, "Crash Bandicoot").getByRole("radio")).toHaveCount(0);
    await choose(page, "Crash Bandicoot", candidate("Crash Bandicoot", 1996));
    await expect(gameRow(page, "Castlevania Anniversary Collection")).toContainText("¿Es este juego?");
    await choose(page, "Castlevania Anniversary Collection", "Sí");
    await expect(toast(page, "«Castlevania Anniversary Collection» pasó a «Elegí un estado».")).toBeVisible();
    await openGroup(page, "¿Cómo lo dejaste?");
    await expect(gameRow(page, "Overwatch")).toContainText("IGN lo tiene como terminado y como abandonado.");
    await choose(page, "Overwatch", "Lo terminaste");
    // Solo multijugador: después de decir cómo lo dejó, le toca «¿Es sin fin?» (tasks.md 10.1).
    await expect(toast(page, "«Overwatch» pasó a «¿Es sin fin?».")).toBeVisible();
    await openGroup(page, "No lo encontré");
    await gameRow(page, LONG_TITLE).getByRole("button", { name: "No importar" }).click();
    await expect(toast(page, `«${LONG_TITLE}» no se va a importar.`)).toBeVisible();
    await gameRow(page, "Cartas del Faro").getByRole("button", { name: "Cargar a mano" }).click();
    await expect(toast(page, "«Cartas del Faro» pasó a «Listos para importar» con «Cargar a mano».")).toBeVisible();
    await openGroup(page, "¿Es de tu familia?");
    await choose(page, "Portal 2", "Sí, es de mi familia");
    await openGroup(page, "¿Es sin fin?");
    await choose(page, "Among Us", "Sí, no se termina");
    await expect(toast(page, "«Among Us» pasó a «Listos para importar» con «Jugado · sin fin».")).toBeVisible();
    await choose(page, "Overwatch", "Sí, no se termina");
    await openGroup(page, "¿Lo vas a jugar alguna vez?");
    await choose(page, "8BitMMO", "No");
    await expect(toast(page, "«8BitMMO» pasó a «Listos para importar» con «Sin interés».")).toBeVisible();
    await openGroup(page, "Elegí un estado");
    await expect(gameRow(page, "20XX")).toBeVisible();
    await gameRow(page, "Hollow Knight").getByRole("button", { name: "Otro estado" }).click();
    await page.getByRole("group", { name: "Estado de Hollow Knight" }).getByRole("button", { name: "En pausa" }).click();
    await expect(toast(page, "«Hollow Knight» pasó a «Listos para importar» con «En pausa».")).toBeVisible();
    await page.getByRole("checkbox", { name: /^Seleccionar los \d+$/ }).click();
    const bar = page.getByRole("group", { name: "Selección" });
    await expect(bar.getByRole("button", { name: "Pasar a Listos" })).toHaveCount(0);
    await bar.getByRole("button", { name: "Lo terminé", exact: true }).click();
    // Cada uno pasa al grupo que le toca: Rocket League, solo multijugador, sigue a «¿Es sin fin?» (tasks.md 10.2).
    await expect(toast(page, "cambiaron de grupo:")).toContainText("a «¿Es sin fin?»");
    await openGroup(page, "Listos para importar");
    await expect(gameRow(page, "Grand Theft Auto V")).toContainText("Entra como Completado · Epic Games · Gratis");
    await expect(gameRow(page, "Q.U.B.E. 2 Soundtrack")).toContainText(NOT_A_GAME);

    await page.getByRole("button", { name: "Confirmar importación" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Entraron" })).toContainText("1 marcado «Sin interés»");
    await page.goto("/library");
    for (const title of ["Hollow Knight", "Celeste", "Portal 2", "Overwatch", "Crash Bandicoot", "20XX", "Cartas del Faro", "60 Seconds!"]) {
      await expect(gameCard(page, title)).toBeVisible();
    }
    await expect(gameCard(page, "Castlevania Anniversary Collection - Ultimate Edition")).toBeVisible();
    await expect(gameCard(page, "8BitMMO")).toHaveCount(0);
    await gameCard(page, "60 Seconds!").getByRole("link", { name: "Ver la ficha de 60 Seconds!" }).click();
    await expect(page.getByText("unas 2.3 h · HowLongToBeat").filter({ visible: true }).first()).toBeVisible();
  });

  test("Mismo nombre, otro año", async ({ page }) => {
    await signInAsNewAccount(page);
    await page.goto("/import");
    await upload(page, "Playnite", PLAYNITE_REAL_CASES);
    await waitForMatching(page);

    await openGroup(page, "Elegí un estado");

    await expect(gameRow(page, "20XX")).toContainText("2017");
    await openGroup(page, "¿Cuál de estos es?");
    await expect(gameRow(page, "Castlevania Anniversary Collection")).toBeVisible();
    await expect(gameRow(page, "20XX")).toHaveCount(0);
  });

  test("Fortnite de IGN y de Epic, Styx sin la edición y lo que no es un juego", async ({ page }) => {
    await signInAsNewAccount(page);
    await page.goto("/import");
    await upload(page, "IGN", IGN_REAL_CASES);
    await upload(page, "Playnite", PLAYNITE_REAL_CASES);
    await waitForMatching(page);

    await openGroup(page, "¿Cuál de estos es?");
    await expect(gameRow(page, "Fortnite")).toContainText("En IGN: Fortnite · 2017");
    await expect(gameRow(page, "Fortnite")).toContainText("En Epic: Fortnite · 2020");
    await expect(gameRow(page, "Styx: Shards of Darkness - Deluxe Edition")).toContainText("¿Es este juego?");
    await expect(gameRow(page, "Styx: Shards of Darkness - Deluxe Edition")).toContainText("Styx: Shards of Darkness2017");
    await choose(page, "Fortnite", candidate("Fortnite", 2017));
    await openGroup(page, "No lo encontré");
    await expect(gameRow(page, "Snakebird Complete")).toContainText("En IGN: Snakebird Complete · 2015");
    await expect(gameRow(page, "Snakebird Complete")).toContainText("En Epic: Snakebird Complete · 2019");
    await gameRow(page, "Snakebird Complete").getByRole("button", { name: "No importar" }).click();
    await expect(toast(page, "«Snakebird Complete» no se va a importar.")).toBeVisible();
    await expect(gameRow(page, "Snakebird Complete")).toHaveCount(0);
    await openGroup(page, "Elegí un estado");
    await expect(gameRow(page, "[REDACTED]")).toContainText("2024");
    await openGroup(page, "Listos para importar");
    await expect(gameRow(page, "Fortnite")).toHaveCount(1);
    await expect(gameRow(page, "Fortnite")).toContainText("Entra como Completado · Epic Games · Gratis");
    await expect(gameRow(page, "Ubisoft Connect Services")).toContainText(NOT_A_GAME);
    await expect(gameRow(page, "Homicipher: Demo")).toContainText(NOT_A_GAME);

    await gameRow(page, "Homicipher: Demo").getByRole("button", { name: "Volver a revisar" }).click();

    await expect(toast(page, "«Homicipher: Demo» volvió a «No lo encontré».")).toBeVisible();
    await openGroup(page, "No lo encontré");
    await expect(gameRow(page, "Homicipher: Demo")).toContainText("No parece un juego: es una demo, una beta, un soundtrack o algo parecido.");
  });

  test("Elegido sin jugar", async ({ page }) => {
    await signInAsNewAccount(page);
    await page.goto("/import");
    await upload(page, "Playnite", PLAYNITE_REAL_CASES);
    await waitForMatching(page);
    await openGroup(page, "¿Cuál de estos es?");

    await choose(page, "LOVE", candidate("Love", 2015));

    await expect(toast(page, "«LOVE» pasó a «¿Lo vas a jugar alguna vez?».")).toBeVisible();
    await expect(gameRow(page, "LOVE")).toHaveCount(0);
    await openGroup(page, "¿Lo vas a jugar alguna vez?");
    await expect(gameRow(page, "Love").getByRole("button", { name: "Sí, algún día" })).toBeVisible();
  });

  test("Volver desde otro grupo", async ({ page }) => {
    await signInAsNewAccount(page);
    await page.goto("/import");
    await upload(page, "Playnite", PLAYNITE_REAL_CASES);
    await waitForMatching(page);
    await openGroup(page, "¿Cuál de estos es?");
    await choose(page, "LOVE", candidate("Love", 2015));
    await openGroup(page, "¿Lo vas a jugar alguna vez?");

    await gameRow(page, "Love").getByRole("button", { name: "Volver a revisar" }).click();

    await expect(toast(page, "«LOVE» volvió a «¿Cuál de estos es?».")).toBeVisible();
    await expect(gameRow(page, "Love")).toHaveCount(0);
    await openGroup(page, "¿Cuál de estos es?");
    await expect(gameRow(page, "LOVE").getByRole("button", { name: candidate("Love", 2015) })).toBeVisible();
  });

  test("Volver después de elegir un candidato", async ({ page }) => {
    await signInAsNewAccount(page);
    await page.goto("/import");
    await upload(page, "IGN", IGN_SAMPLE);
    await waitForMatching(page);
    await openGroup(page, "¿Cuál de estos es?");
    await choose(page, "Crash Bandicoot", candidate("Crash Bandicoot", 2017));
    await openGroup(page, "Listos para importar");

    await gameRow(page, "Crash Bandicoot").getByRole("button", { name: "Volver a revisar" }).click();

    await expect(toast(page, "«Crash Bandicoot» volvió a «¿Cuál de estos es?».")).toBeVisible();
    await expect(gameRow(page, "Crash Bandicoot")).toHaveCount(0);
    await openGroup(page, "¿Cuál de estos es?");
    await expect(gameRow(page, "Crash Bandicoot").getByRole("button", { name: candidate("Crash Bandicoot", 2017) })).toBeVisible();
    await expect(gameRow(page, "Crash Bandicoot").getByRole("radio")).toHaveCount(0);
  });

  test("Retomar la revisión", async ({ page }) => {
    await signInAsNewAccount(page);
    await page.goto("/import");
    await upload(page, "IGN", IGN_SAMPLE);
    await waitForMatching(page);
    await openGroup(page, "¿Es sin fin?");
    await choose(page, "Among Us", "No, lo terminé");

    await page.reload();

    await openGroup(page, "Listos para importar");
    await expect(gameRow(page, "Among Us")).toBeVisible();
    await expect(groupButton(page, "¿Es sin fin?")).toContainText("0");
    await page.goto("/library");
    await expect(page.getByText("Todavía no cargaste ningún juego.")).toBeVisible();
  });

  test("Descartar la revisión", async ({ page }) => {
    await signInAsNewAccount(page);
    await importAllSources(page);
    await openGroup(page, "¿Es sin fin?");
    await choose(page, "Among Us", "No, lo terminé");

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.getByRole("dialog", { name: "¿Empezar de nuevo?" }).getByRole("button", { name: "Empezar de nuevo" }).click();

    await expect(toast(page, "Empezaste de nuevo: la revisión quedó vacía.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Revisión" })).toHaveCount(0);
    await expect(sourceCard(page, "IGN").getByRole("button", { name: "Subir archivo", exact: true })).toBeVisible();
    await expect(sourceCard(page, "Playnite").getByRole("button", { name: "Subir archivo", exact: true })).toBeVisible();
    await expect(sourceCard(page, "Steam").getByText("Cuenta conectada").filter({ visible: true })).toBeVisible();
    await page.reload();
    await expect(sourceCard(page, "IGN").getByRole("button", { name: "Subir archivo", exact: true })).toBeVisible();
    await page.goto("/library");
    await expect(page.getByText("Todavía no cargaste ningún juego.")).toBeVisible();
  });

  test("el aviso de cada acción queda a la vista aunque la lista sea larga", async ({ page }) => {
    await signInAsNewAccount(page);
    await importAllSources(page);
    await openGroup(page, "¿Lo vas a jugar alguna vez?");

    await gameRow(page, "8BitMMO").getByRole("button", { name: "No", exact: true }).click();

    await expect(toast(page, "«8BitMMO» pasó a «Listos para importar» con «Sin interés».")).toBeInViewport();
  });

  test("Abrir la guía de Playnite", async ({ page }) => {
    await signInAsNewAccount(page);
    await page.goto("/import");

    await sourceCard(page, "Playnite").getByRole("link", { name: "¿Cómo saco el archivo de Playnite?" }).click();

    await page.waitForURL("**/import/guide/playnite");
    await expect(page.getByRole("heading", { level: 1, name: "¿Cómo saco mi biblioteca de Playnite?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "la página de su autor" })).toHaveAttribute("target", "_blank");
    await expectNoHorizontalScroll(page, "la guía de Playnite");
    await page.getByRole("link", { name: "Volver a Importar" }).click();
    await page.waitForURL("**/import");
  });

  test("Exportar de IGN: la guía trae un marcador que solo corre en IGN", async ({ page }) => {
    await signInAsNewAccount(page);
    await page.goto("/import");
    await sourceCard(page, "IGN").getByRole("link", { name: "¿Cómo saco el archivo de IGN?" }).click();
    await page.waitForURL("**/import/guide/ign");
    const bookmarklet = page.getByRole("link", { name: "Exportar de IGN" });
    await expect(bookmarklet).toHaveAttribute("href", /^javascript:/);
    const href = (await bookmarklet.getAttribute("href")) ?? "";
    // El alert del marcador frena la página hasta que alguien lo cierra.
    const shown: string[] = [];
    page.once("dialog", (dialog) => {
      shown.push(dialog.message());
      void dialog.dismiss();
    });

    // El marcador del build de producción, corrido fuera de IGN: tiene que avisar y no pedir nada.
    await page.evaluate((code) => {
      // eslint-disable-next-line sonarjs/code-eval -- el test corre el marcador como lo haría el navegador.
      new Function(decodeURIComponent(code.slice("javascript:".length)))();
    }, href);

    await expect.poll(() => shown).toEqual(["Este marcador se usa en www.ign.com: entrá a tu lista de juegos de IGN y tocalo ahí."]);
    await expect(page.getByText(/El marcador depende de cómo arma IGN su página/)).toBeVisible();
    await expectNoHorizontalScroll(page, "la guía de IGN");
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

  test("se usa desde 360 px sin desplazamiento horizontal, también con un nombre largo", async ({ page }) => {
    await signInAsNewAccount(page);
    await importAllSources(page);
    await page.setViewportSize({ width: NARROW_WIDTH, height: NARROW_HEIGHT });

    await openGroup(page, "No lo encontré");

    await expect(gameRow(page, LONG_TITLE)).toBeVisible();
    await expectNoHorizontalScroll(page, "la revisión con un nombre largo");
    await openGroup(page, "¿Cuál de estos es?");
    await expectNoHorizontalScroll(page, "los candidatos de la revisión");
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
    await expect(gameRow(page, "Among Us").getByRole("button", { name: en("import.choices.endless"), exact: true })).toBeVisible();
    await expect(gameRow(page, "Among Us").getByRole("radio")).toHaveCount(0);
    await expect(page.getByRole("button", { name: en("import.confirm.action") })).toBeVisible();
    await expectNoSpanish(page, "la importación");

    await groupButton(page, en("import.groups.which.name"), en("import.review.nav")).click();

    await expect(page.getByRole("heading", { level: 2, name: en("import.groups.which.name") })).toBeVisible();
    await expect(page.getByRole("button", { name: en("import.choices.search") })).toBeVisible();
    await expectNoSpanish(page, "«¿Cuál de estos es?» en inglés");
  });

  test("las guías en inglés", async ({ page }) => {
    await signInAsNewAccount(page);
    await switchToEnglish(page);

    await page.goto("/import/guide/ign");

    await expect(page.getByRole("heading", { level: 1, name: en("import.guides.ign.title") })).toBeVisible();
    await expectNoSpanish(page, "la guía de IGN");
    await page.goto("/import/guide/playnite");
    await expect(page.getByRole("heading", { level: 1, name: en("import.guides.playnite.title") })).toBeVisible();
    await expectNoSpanish(page, "la guía de Playnite");
  });
});

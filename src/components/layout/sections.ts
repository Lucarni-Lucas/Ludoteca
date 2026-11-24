/** El nombre de cada sección sale del catálogo, en `nav.sections.<id>`. */
export const SECTIONS = [
  { id: "library", href: "/library" },
  { id: "check", href: "/check" },
  { id: "subscriptions", href: "/subscriptions" },
  { id: "stores", href: "/stores" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

const SETTINGS_PATH = "/settings";
// Importar es una opción de Ajustes aunque viva en su propia ruta: el avatar se marca igual.
const IMPORT_PATH = "/import";
const GAME_DETAIL_PATH = "/games";

function isWithin(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function sectionForPath(pathname: string): SectionId | null {
  // La ficha de un juego es parte de la biblioteca, aunque viva en otra ruta.
  if (isWithin(pathname, GAME_DETAIL_PATH)) {
    return "library";
  }

  return SECTIONS.find(({ href }) => isWithin(pathname, href))?.id ?? null;
}

export function isSettingsPath(pathname: string): boolean {
  return isWithin(pathname, SETTINGS_PATH) || isWithin(pathname, IMPORT_PATH);
}

export const SECTIONS = [
  { id: "library", href: "/library", label: "Biblioteca" },
  { id: "check", href: "/check", label: "¿Lo tengo?" },
  { id: "subscriptions", href: "/subscriptions", label: "Suscripciones" },
  { id: "stores", href: "/stores", label: "Tiendas" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

const SETTINGS_PATH = "/settings";
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
  return isWithin(pathname, SETTINGS_PATH);
}

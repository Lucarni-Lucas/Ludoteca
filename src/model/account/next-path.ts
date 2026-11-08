export const DEFAULT_SIGNED_IN_PATH = "/library";

// Solo sirve para que el navegador de URL resuelva `next`; nunca se navega a este origen.
const PARSING_ORIGIN = "https://ludoteca.invalid";

/**
 * Acepta solo rutas relativas, para que un link armado no use el ingreso para mandarte a otro sitio.
 * Delega en URL porque los navegadores también tratan `/\sitio.com` y las tabulaciones como otro origen.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next?.startsWith("/") || !URL.canParse(next, PARSING_ORIGIN)) {
    return DEFAULT_SIGNED_IN_PATH;
  }

  const url = new URL(next, PARSING_ORIGIN);
  return url.origin === PARSING_ORIGIN ? `${url.pathname}${url.search}${url.hash}` : DEFAULT_SIGNED_IN_PATH;
}

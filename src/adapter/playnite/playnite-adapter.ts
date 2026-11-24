import type { ImportFileRead } from "@/model/import/import-row";

import { playniteExportSchema } from "./dto/playnite-dto";
import { hasStore, toImportRow } from "./playnite-mapper";

/**
 * `null` si el contenido no es un export de Playnite Library Exporter con `schemaVersion = 1`: otra
 * versión del formato no se lee a ciegas. Un juego sin tienda (agregado a mano en Playnite) se cuenta aparte.
 */
export function readPlayniteExport(content: unknown): ImportFileRead | null {
  const parsed = playniteExportSchema.safeParse(content);

  if (!parsed.success) {
    return null;
  }

  const withStore = parsed.data.games.filter(hasStore);

  return {
    source: "playnite",
    rows: withStore.map(toImportRow),
    skipped: parsed.data.games.length - withStore.length,
  };
}

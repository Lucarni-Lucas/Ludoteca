import type { ImportFileRead } from "@/model/import/import-row";

import { ignExportSchema } from "./dto/ign-dto";
import { toImportRow } from "./ign-mapper";

/** `null` si el contenido no es un export de IGN: el servicio prueba con el siguiente adapter. */
export function readIgnExport(content: unknown): ImportFileRead | null {
  const parsed = ignExportSchema.safeParse(content);

  if (!parsed.success) {
    return null;
  }

  return { source: "ign", rows: parsed.data.records.map(toImportRow), skipped: 0 };
}

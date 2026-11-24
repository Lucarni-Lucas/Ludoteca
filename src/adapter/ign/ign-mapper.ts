import { readIgnStatuses } from "@/model/import/ign-status";
import type { ImportRow } from "@/model/import/import-row";
import { logger } from "@/shared/logger";

import type { IgnRecordDto } from "./dto/ign-dto";

/** IGN no da copias: su `steamId` solo sirve para cruzar con IGDB. */
export function toImportRow(record: IgnRecordDto): ImportRow {
  const { statuses, unknown } = readIgnStatuses(record.status ?? null, record.flags ?? []);

  if (unknown.length > 0) {
    logger.warn("Estados de IGN desconocidos, se ignoran", { ignId: record.ignId, unknown });
  }

  return {
    source: "ign",
    sourceKey: record.ignId,
    title: record.name,
    altTitles: record.alt ?? [],
    year: record.year ?? null,
    storeName: null,
    storeGameId: null,
    playtimeMinutes: null,
    ignStatuses: statuses,
    ignScore: record.score ?? null,
    hltbMainHours: record.hltb?.[0] ?? null,
    steamAppId: record.steamId == null ? null : String(record.steamId),
  };
}

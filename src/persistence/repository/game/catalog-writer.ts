import { inArray } from "drizzle-orm";

import type { IgdbGameData } from "@/model/game/catalog";
import type { Database } from "@/persistence/db";
import { toIgdbCatalogRow } from "@/persistence/mapper/game/game-mapper";
import { catalogGame } from "@/persistence/sql/game/catalog-game";

/**
 * El catálogo es compartido: un juego de IGDB que ya está no se pisa. Devuelve el id de catálogo de cada
 * id de IGDB. Corre dentro de la transacción de quien llama, como `writeStatusChange`.
 */
export async function upsertIgdbCatalogs(
  tx: Database,
  games: readonly IgdbGameData[],
): Promise<ReadonlyMap<number, string>> {
  if (games.length === 0) {
    return new Map();
  }

  await tx
    .insert(catalogGame)
    .values(games.map(toIgdbCatalogRow))
    .onConflictDoNothing({ target: catalogGame.igdbId });

  const rows = await tx
    .select({ id: catalogGame.id, igdbId: catalogGame.igdbId })
    .from(catalogGame)
    .where(inArray(catalogGame.igdbId, games.map((game) => game.igdbId)));

  return new Map(rows.flatMap(({ id, igdbId }) => (igdbId === null ? [] : [[igdbId, id] as const])));
}

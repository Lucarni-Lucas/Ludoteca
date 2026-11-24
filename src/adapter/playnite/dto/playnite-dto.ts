import { z } from "zod";

export const PLAYNITE_GENERATOR_NAME = "Playnite Library Exporter";
export const PLAYNITE_SCHEMA_VERSION = 1;

/** Un juego del export. Solo se validan los campos que se usan; el resto se ignora. */
export const playniteGameSchema = z.object({
  name: z.string(),
  // Vacíos en un juego agregado a mano en Playnite: esas filas se saltean.
  sourceName: z.string().nullish(),
  providerGameId: z.string().nullish(),
  playtimeSeconds: z.number().nonnegative().nullish(),
  // «2020-4-23», sin ceros a la izquierda.
  releaseDate: z.string().nullish(),
});

/** Se reconoce por el nombre del exportador y su versión de formato (design.md §5). */
export const playniteExportSchema = z.object({
  generator: z.object({ name: z.literal(PLAYNITE_GENERATOR_NAME) }),
  schemaVersion: z.literal(PLAYNITE_SCHEMA_VERSION),
  games: z.array(playniteGameSchema),
});

export type PlayniteGameDto = z.infer<typeof playniteGameSchema>;
export type PlayniteExportDto = z.infer<typeof playniteExportSchema>;

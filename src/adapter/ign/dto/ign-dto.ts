import { z } from "zod";

/** Un juego del export de IGN. Solo se validan los campos que se usan; el resto se ignora. */
export const ignRecordSchema = z.object({
  ignId: z.string().min(1),
  name: z.string().min(1),
  alt: z.array(z.string()).nullish(),
  year: z.number().int().nullish(),
  status: z.string().nullish(),
  flags: z.array(z.string()).nullish(),
  score: z.number().nullish(),
  steamId: z.number().int().nullish(),
  // [principal, extras, completo], en horas; cualquiera puede faltar.
  hltb: z.array(z.number().nullable()).nullish(),
});

/** Se reconoce por `records[]` con `ignId` (design.md §5). */
export const ignExportSchema = z.object({
  records: z.array(ignRecordSchema),
});

export type IgnRecordDto = z.infer<typeof ignRecordSchema>;
export type IgnExportDto = z.infer<typeof ignExportSchema>;

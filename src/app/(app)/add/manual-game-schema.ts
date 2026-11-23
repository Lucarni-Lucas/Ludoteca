import { z } from "zod";

import type { ValidationKey } from "@/i18n/messages";
import { COPY_KINDS, type CopyKind } from "@/model/copy/copy";
import type { LibraryEntryInput, ManualGameInput, NewCopyInput } from "@/service/game/catalog-service";

const MAX_HOURS = 99_999.9;
const MAX_TEXT_LENGTH = 200;
const MAX_URL_LENGTH = 2048;
// Un tope de forma, para que un pedido no traiga miles de filas; nadie tiene tantas copias de un juego.
const MAX_COPIES_PER_GAME = 30;
// Claves de `validation`: el texto, en el idioma del usuario, lo pone el manejador de errores.
const NOT_HTTPS: ValidationKey = "httpsRequired";
const TITLE_REQUIRED: ValidationKey = "titleRequired";
const YEAR_INVALID: ValidationKey = "yearInvalid";
const DURATION_INVALID: ValidationKey = "durationInvalid";
export const PLAYED_HOURS_INVALID: ValidationKey = "playedHours";

function emptyToNull(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim() === "" ? null : value.trim();
}

function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess(emptyToNull, schema.nullable());
}

const optionalText = optional(z.string().max(MAX_TEXT_LENGTH));

export const httpsUrlSchema = optional(
  z.url({ protocol: /^https$/, error: NOT_HTTPS }).max(MAX_URL_LENGTH, { error: NOT_HTTPS }),
);

const copyRowSchema = z.object({
  storeId: optional(z.uuid()),
  otherStoreName: optionalText,
  kind: z.enum(COPY_KINDS),
  familyOwner: optionalText,
  // Sin tope acá: el de 40 caracteres lo pone el modelo, con el mensaje que pide la spec.
  kindDetail: optional(z.string()),
});

const entryShape = {
  copies: z.array(copyRowSchema).max(MAX_COPIES_PER_GAME),
  statusId: optional(z.uuid()),
  // El rango lo valida el modelo; acá solo la forma.
  score: z.number().nullable(),
  // Igual que el puntaje: el rango y el redondeo son del modelo.
  playedHours: optional(z.coerce.number({ error: PLAYED_HOURS_INVALID })).optional(),
};

const manualGameSchema = z.object({
  title: z.string({ error: TITLE_REQUIRED }).trim().min(1, { error: TITLE_REQUIRED }).max(MAX_TEXT_LENGTH),
  coverUrl: httpsUrlSchema,
  pageUrl: httpsUrlSchema,
  // Solo la forma: el rango depende de la fecha y lo decide el modelo (design.md §5).
  year: optional(z.coerce.number().int({ error: YEAR_INVALID })),
  estimatedHours: optional(
    z.coerce.number().min(0, { error: DURATION_INVALID }).max(MAX_HOURS, { error: DURATION_INVALID }),
  ),
  ...entryShape,
});

export type CopyRowFormValues = Readonly<{
  storeId: string;
  otherStoreName: string;
  kind: CopyKind;
  familyOwner: string;
  kindDetail: string;
}>;

/** Lo que manda cualquiera de las dos variantes del formulario de alta. */
export type EntryFormValues = Readonly<{
  copies: readonly CopyRowFormValues[];
  statusId: string;
  score: number | null;
  playedHours?: string;
}>;

export type ManualGameFormValues = EntryFormValues &
  Readonly<{
    title: string;
    coverUrl: string;
    pageUrl: string;
    year: string;
    estimatedHours: string;
  }>;

type CopyRowOutput = z.output<typeof copyRowSchema>;

/** Una tienda escrita a mano gana sobre la elegida; sin ninguna de las dos, la fila queda sin tienda. */
function toStoreChoice(row: CopyRowOutput): NewCopyInput["store"] {
  if (row.otherStoreName) {
    return { otherName: row.otherStoreName };
  }

  return row.storeId ? { storeId: row.storeId } : null;
}

function toCopyInput(row: CopyRowOutput): NewCopyInput {
  return {
    store: toStoreChoice(row),
    kind: row.kind,
    acquiredOn: null,
    familyOwner: row.familyOwner,
    kindDetail: row.kindDetail,
  };
}

function toEntryInput(input: z.output<z.ZodObject<typeof entryShape>>): LibraryEntryInput {
  return {
    statusId: input.statusId,
    copies: input.copies.map(toCopyInput),
    score: input.score,
    // Vacío no viaja: es «sin total a mano».
    ...(input.playedHours == null ? {} : { playedHours: input.playedHours }),
  };
}

export const entryInputSchema = z.object(entryShape).transform(toEntryInput);

export const manualGameInputSchema = manualGameSchema.transform(
  (input): ManualGameInput => ({
    title: input.title,
    year: input.year,
    estimatedHours: input.estimatedHours,
    coverUrl: input.coverUrl,
    pageUrl: input.pageUrl,
    ...toEntryInput(input),
  }),
);

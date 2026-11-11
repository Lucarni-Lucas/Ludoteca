import { z } from "zod";

import { COPY_KINDS } from "@/model/copy/copy";
import type { ManualGameInput } from "@/service/game/catalog-service";

const MIN_YEAR = 1950;
const MAX_YEAR = 2100;
const MAX_HOURS = 99_999.9;
const MAX_TEXT_LENGTH = 200;
const MAX_URL_LENGTH = 2048;
const NOT_HTTPS_MESSAGE = "El link tiene que empezar con https://";

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
  z.url({ protocol: /^https$/, error: NOT_HTTPS_MESSAGE }).max(MAX_URL_LENGTH, { error: NOT_HTTPS_MESSAGE }),
);

const manualGameSchema = z.object({
  title: z.string({ error: "Poné el título del juego" }).trim().min(1, { error: "Poné el título del juego" }).max(MAX_TEXT_LENGTH),
  coverUrl: httpsUrlSchema,
  pageUrl: httpsUrlSchema,
  storeId: optional(z.uuid()),
  otherStoreName: optionalText,
  kind: z.enum(COPY_KINDS).nullable(),
  familyOwner: optionalText,
  year: optional(z.coerce.number().int().min(MIN_YEAR, { error: "Revisá el año" }).max(MAX_YEAR, { error: "Revisá el año" })),
  estimatedHours: optional(
    z.coerce.number().min(0, { error: "Revisá la duración" }).max(MAX_HOURS, { error: "Revisá la duración" }),
  ),
  statusId: optional(z.uuid()),
});

export type ManualGameFormValues = Readonly<{
  title: string;
  coverUrl: string;
  pageUrl: string;
  storeId: string;
  otherStoreName: string;
  kind: (typeof COPY_KINDS)[number] | null;
  familyOwner: string;
  year: string;
  estimatedHours: string;
  statusId: string;
}>;

function toStoreChoice(input: z.output<typeof manualGameSchema>): ManualGameInput["store"] {
  if (input.otherStoreName) {
    return { otherName: input.otherStoreName };
  }

  return input.storeId ? { storeId: input.storeId } : null;
}

export const manualGameInputSchema = manualGameSchema.transform(
  (input): ManualGameInput => ({
    title: input.title,
    year: input.year,
    estimatedHours: input.estimatedHours,
    coverUrl: input.coverUrl,
    pageUrl: input.pageUrl,
    statusId: input.statusId,
    store: toStoreChoice(input),
    kind: input.kind,
    acquiredOn: null,
    familyOwner: input.familyOwner,
  }),
);

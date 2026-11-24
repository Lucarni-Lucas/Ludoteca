import { z } from "zod";

import { COPY_KINDS } from "@/model/copy/copy";

// Lo que se pega en el campo de Steam: un SteamID, un link o un nombre.
const MAX_STEAM_PROFILE_LENGTH = 200;
const MAX_TITLE_LENGTH = 300;
const MAX_STATUS_KEY_LENGTH = 40;
// Una revisión real tiene unos 500 juegos: alcanza con holgura para «Seleccionar todos».
const MAX_ENTRY_IDS = 1000;

export const steamProfileSchema = z.string().trim().min(1).max(MAX_STEAM_PROFILE_LENGTH);

export const candidateSchema = z.object({
  igdbId: z.number().int().positive(),
  baseIgdbId: z.number().int().positive(),
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  year: z.number().int().nullable(),
  coverUrl: z.url().nullable(),
});

const choiceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("candidate"), candidate: candidateSchema }),
  z.object({ kind: z.literal("status"), statusKey: z.string().min(1).max(MAX_STATUS_KEY_LENGTH) }),
  z.object({ kind: z.literal("copy_kind"), copyKind: z.enum(COPY_KINDS) }),
  ...(["search", "other_status", "manual", "exclude", "other_kind", "exclude_copy", "endless", "completed", "keep", "not_interested"] as const).map(
    (kind) => z.object({ kind: z.literal(kind) }),
  ),
]);

export const decisionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choose"), choice: choiceSchema }),
  z.object({ kind: z.literal("accept") }),
  z.object({ kind: z.literal("reset") }),
  z.object({ kind: z.literal("copy_kind"), storeId: z.uuid(), copyKind: z.enum(COPY_KINDS) }),
]);

export const decideSchema = z.object({
  entryIds: z.array(z.uuid()).min(1).max(MAX_ENTRY_IDS),
  decision: decisionSchema,
});

export const searchAgainSchema = z.object({
  entryId: z.uuid(),
  chosen: candidateSchema,
});

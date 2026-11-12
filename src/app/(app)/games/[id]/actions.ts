"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { COPY_KINDS, LOST_REASONS, type LostReason } from "@/model/copy/copy";
import { GameNotFoundError } from "@/model/game/errors";
import { toCorrections } from "@/model/game/library-game";
import { requireSessionUser } from "@/security/session";
import type { AddCopyResult } from "@/service/copy/copy-service";
import { getCopyService } from "@/service/copy/instance";
import { getLibraryService } from "@/service/game/instance";
import { type ActionFailure, type ActionResult, toActionResult } from "@/shared/action-result";
import { parseInput } from "@/shared/parse-input";

import { httpsUrlSchema } from "../../add/manual-game-schema";

const MAX_HOURS = 99_999.9;
const MAX_TEXT_LENGTH = 200;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const idSchema = z.uuid();
const statusIdSchema = z.uuid();
const scoreSchema = z.number().nullable();

function blankToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

const optionalDate = z.preprocess(blankToNull, z.string().regex(DATE_PATTERN).nullable());

const addCopySchema = z
  .object({
    storeId: z.preprocess(blankToNull, z.uuid().nullable()),
    otherStoreName: z.preprocess(blankToNull, z.string().trim().max(MAX_TEXT_LENGTH).nullable()),
    kind: z.enum(COPY_KINDS),
    acquiredOn: optionalDate,
    familyOwner: z.preprocess(blankToNull, z.string().trim().max(MAX_TEXT_LENGTH).nullable()),
    // Sin tope acá: lo pone el modelo, con el mensaje que pide la spec.
    kindDetail: z.preprocess(blankToNull, z.string().trim().nullable().optional()),
  })
  .refine((copy) => copy.storeId !== null || copy.otherStoreName !== null, { error: "Elegí una tienda" });

const correctionsSchema = z.object({
  estimatedHours: z.preprocess(blankToNull, z.coerce.number().min(0).max(MAX_HOURS).nullable()),
  endless: z.boolean(),
  coverUrl: httpsUrlSchema,
});

export type AddCopyFormValues = z.input<typeof addCopySchema>;
export type CorrectionsFormValues = z.input<typeof correctionsSchema>;

function refreshGame(gameId: string): void {
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/library");
}

/** Toda acción de la ficha valida el id, llama al servicio con el usuario de la sesión y refresca la pantalla. */
async function runGameAction<T>(
  gameId: string,
  action: (userId: string, id: string) => Promise<T>,
): Promise<ActionResult<T>> {
  const user = await requireSessionUser();

  return toActionResult(async () => {
    const result = await action(user.id, parseInput(idSchema, gameId));

    refreshGame(gameId);
    return result;
  });
}

export async function changeStatusAction(gameId: string, statusId: string): Promise<ActionResult<void>> {
  return runGameAction(gameId, (userId, id) =>
    getLibraryService().changeStatus(userId, id, parseInput(statusIdSchema, statusId)),
  );
}

export async function setScoreAction(gameId: string, score: number | null): Promise<ActionResult<number | null>> {
  const user = await requireSessionUser();

  // Solo refresca la biblioteca: el control de la ficha ya muestra el valor y no debe saltar mientras se usa.
  return toActionResult(async () => {
    const saved = await getLibraryService().setScore(
      user.id,
      parseInput(idSchema, gameId),
      parseInput(scoreSchema, score),
    );

    revalidatePath("/library");
    return saved;
  });
}

export async function addCopyAction(gameId: string, values: AddCopyFormValues): Promise<ActionResult<AddCopyResult>> {
  return runGameAction(gameId, (userId, id) => {
    const input = parseInput(addCopySchema, values);
    const store = input.otherStoreName ? { otherName: input.otherStoreName } : { storeId: input.storeId ?? "" };

    return getCopyService().addCopy(userId, id, {
      store,
      kind: input.kind,
      acquiredOn: input.acquiredOn,
      familyOwner: input.familyOwner,
      kindDetail: input.kindDetail,
    });
  });
}

export async function markCopyLostAction(
  gameId: string,
  copyId: string,
  reason: LostReason,
  lostAt: string,
): Promise<ActionResult<void>> {
  return runGameAction(gameId, (userId) =>
    getCopyService().markLost(
      userId,
      parseInput(idSchema, copyId),
      parseInput(z.enum(LOST_REASONS), reason),
      parseInput(optionalDate, lostAt),
    ),
  );
}

export async function recoverCopyAction(gameId: string, copyId: string): Promise<ActionResult<void>> {
  return runGameAction(gameId, (userId) => getCopyService().recover(userId, parseInput(idSchema, copyId)));
}

export async function removeCopyAction(gameId: string, copyId: string): Promise<ActionResult<void>> {
  return runGameAction(gameId, (userId) => getCopyService().remove(userId, parseInput(idSchema, copyId)));
}

export async function updateCorrectionsAction(
  gameId: string,
  values: CorrectionsFormValues,
): Promise<ActionResult<void>> {
  return runGameAction(gameId, async (userId, id) => {
    const input = parseInput(correctionsSchema, values);
    const game = await getLibraryService().findGame(userId, id);

    if (!game) {
      throw new GameNotFoundError();
    }

    await getLibraryService().updateCorrections(userId, id, toCorrections(game, input));
  });
}

export async function refreshFromIgdbAction(gameId: string): Promise<ActionResult<void>> {
  return runGameAction(gameId, (userId, id) => getLibraryService().refreshFromIgdb(userId, id));
}

export async function linkToIgdbAction(gameId: string, igdbId: number): Promise<ActionResult<void>> {
  return runGameAction(gameId, (userId, id) =>
    getLibraryService().linkToIgdb(userId, id, parseInput(z.number().int().positive(), igdbId)),
  );
}

export async function setGameNotInterestedAction(gameId: string, notInterested: boolean): Promise<ActionResult<void>> {
  return runGameAction(gameId, (userId, id) =>
    getLibraryService().setNotInterested(userId, [id], parseInput(z.boolean(), notInterested)),
  );
}

export async function removeFromLibraryAction(gameId: string): Promise<ActionFailure> {
  const user = await requireSessionUser();

  const result = await toActionResult(() =>
    getLibraryService().removeFromLibrary(user.id, parseInput(idSchema, gameId)),
  );

  if (result.ok) {
    revalidatePath("/library");
    redirect("/library");
  }

  return result;
}

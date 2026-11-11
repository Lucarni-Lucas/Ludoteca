"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { AddGameResult } from "@/model/game/add-game";
import { requireSessionUser } from "@/security/session";
import { getCatalogService, getCoverService } from "@/service/game/instance";
import { type ActionFailure, type ActionResult, toActionResult } from "@/shared/action-result";
import { InvalidRequestError } from "@/shared/app-error";
import { parseInput } from "@/shared/parse-input";

import { type ManualGameFormValues, manualGameInputSchema } from "./manual-game-schema";

const igdbIdSchema = z.number().int().positive();

export async function addFromIgdbAction(igdbId: number): Promise<ActionResult<AddGameResult>> {
  const user = await requireSessionUser();

  return toActionResult(async () => {
    const result = await getCatalogService().addFromIgdb(user.id, parseInput(igdbIdSchema, igdbId));

    revalidatePath("/library");
    return result;
  });
}

export async function addManualGameAction(values: ManualGameFormValues): Promise<ActionFailure> {
  const user = await requireSessionUser();

  const result = await toActionResult(() =>
    getCatalogService().addManual(user.id, parseInput(manualGameInputSchema, values)),
  );

  if (result.ok) {
    revalidatePath("/library");
    redirect("/library");
  }

  return result;
}

export async function uploadCoverAction(formData: FormData): Promise<ActionResult<string>> {
  const user = await requireSessionUser();

  return toActionResult(async () => {
    const file = formData.get("cover");

    if (!(file instanceof File)) {
      throw new InvalidRequestError("Elegí una imagen.");
    }

    return getCoverService().uploadCover(user.id, {
      bytes: await file.arrayBuffer(),
      contentType: file.type,
      size: file.size,
    });
  });
}

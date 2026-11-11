"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSessionUser } from "@/security/session";
import { getLibraryService } from "@/service/game/instance";
import { type ActionResult, toActionResult } from "@/shared/action-result";
import { parseInput } from "@/shared/parse-input";

const notInterestedSchema = z.object({
  gameIds: z.array(z.uuid()).min(1),
  notInterested: z.boolean(),
});

export async function setNotInterestedAction(gameIds: string[], notInterested: boolean): Promise<ActionResult<void>> {
  const user = await requireSessionUser();

  return toActionResult(async () => {
    const input = parseInput(notInterestedSchema, { gameIds, notInterested });

    await getLibraryService().setNotInterested(user.id, input.gameIds, input.notInterested);
    revalidatePath("/library");
  });
}

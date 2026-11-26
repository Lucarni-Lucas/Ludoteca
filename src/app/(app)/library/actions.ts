"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSessionUser } from "@/security/session";
import { getLibraryService } from "@/service/game/instance";
import { type ActionResult, toActionResult } from "@/shared/action-result";
import { parseInput } from "@/shared/parse-input";

const hiddenSchema = z.object({
  gameIds: z.array(z.uuid()).min(1),
  hidden: z.boolean(),
});

export async function setHiddenAction(gameIds: string[], hidden: boolean): Promise<ActionResult<void>> {
  const user = await requireSessionUser();

  return toActionResult(async () => {
    const input = parseInput(hiddenSchema, { gameIds, hidden });

    await getLibraryService().setHidden(user.id, input.gameIds, input.hidden);
    revalidatePath("/library");
  });
}

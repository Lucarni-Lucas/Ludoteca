"use server";

import { revalidatePath } from "next/cache";

import type { IgdbSearchResult } from "@/model/game/catalog";
import type { ImportSummary } from "@/model/import/confirm";
import type { ImportDecision } from "@/model/import/decision";
import { requireSessionUser } from "@/security/session";
import type { ImportOverview, MatchingProgress, SteamConnected } from "@/service/import/import-service";
import { getImportService } from "@/service/import/instance";
import { type ActionResult, toActionResult } from "@/shared/action-result";
import { parseInput } from "@/shared/parse-input";

import { decideSchema, searchAgainSchema, steamProfileSchema } from "./import-schemas";

export async function connectSteamAction(profile: string): Promise<ActionResult<SteamConnected>> {
  const user = await requireSessionUser();

  return toActionResult(() => getImportService().connectSteam(user.id, parseInput(steamProfileSchema, profile)));
}

export async function refreshSteamAction(): Promise<ActionResult<SteamConnected>> {
  const user = await requireSessionUser();

  return toActionResult(() => getImportService().refreshSteam(user.id));
}

export async function advanceMatchingAction(): Promise<ActionResult<MatchingProgress>> {
  const user = await requireSessionUser();

  return toActionResult(() => getImportService().advanceMatching(user.id));
}

export async function getImportOverviewAction(): Promise<ActionResult<ImportOverview>> {
  const user = await requireSessionUser();

  return toActionResult(() => getImportService().getOverview(user.id));
}

export async function decideAction(entryIds: string[], decision: ImportDecision): Promise<ActionResult<ImportOverview>> {
  const user = await requireSessionUser();

  return toActionResult(() => {
    const input = parseInput(decideSchema, { entryIds, decision });
    return getImportService().decide(user.id, input.entryIds, input.decision);
  });
}

export async function searchAgainAction(entryId: string, chosen: IgdbSearchResult): Promise<ActionResult<ImportOverview>> {
  const user = await requireSessionUser();

  return toActionResult(() => {
    const input = parseInput(searchAgainSchema, { entryId, chosen });
    return getImportService().searchAgain(user.id, input.entryId, input.chosen);
  });
}

export async function confirmImportAction(): Promise<ActionResult<ImportSummary>> {
  const user = await requireSessionUser();

  return toActionResult(async () => {
    const summary = await getImportService().confirm(user.id);
    revalidatePath("/library");
    return summary;
  });
}

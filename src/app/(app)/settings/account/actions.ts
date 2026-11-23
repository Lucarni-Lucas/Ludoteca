"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getRequestLocale } from "@/i18n/locale";
import { LOCALES } from "@/model/account/locale";
import type { LocaleChange } from "@/model/account/settings";
import { signOutCurrentDevice } from "@/security/auth";
import { requireSessionUser } from "@/security/session";
import { getSettingsService } from "@/service/account/instance";
import { type ActionFailure, type ActionResult, toActionResult } from "@/shared/action-result";
import { parseInput } from "@/shared/parse-input";

const localeSchema = z.enum(LOCALES);

export async function signOutAction(): Promise<ActionFailure> {
  await requireSessionUser();

  const result = await toActionResult(signOutCurrentDevice);

  if (result.ok) {
    redirect("/login");
  }

  return result;
}

export async function chooseLocaleAction(locale: string): Promise<ActionResult<LocaleChange>> {
  const user = await requireSessionUser();

  return toActionResult(async () =>
    getSettingsService().chooseLocale(user.id, parseInput(localeSchema, locale), await getRequestLocale()),
  );
}

"use server";

import { redirect } from "next/navigation";

import { signOutCurrentDevice } from "@/security/auth";
import { requireSessionUser } from "@/security/session";
import { type ActionFailure, toActionResult } from "@/shared/action-result";

export async function signOutAction(): Promise<ActionFailure> {
  await requireSessionUser();

  const result = await toActionResult(signOutCurrentDevice);

  if (result.ok) {
    redirect("/login");
  }

  return result;
}

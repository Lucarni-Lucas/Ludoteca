"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { startGoogleSignIn } from "@/security/auth";
import { type ActionFailure, toActionResult } from "@/shared/action-result";
import { InvalidRequestError } from "@/shared/app-error";

const signInInputSchema = z.object({
  next: z.string().trim().optional(),
});

async function requestSignInUrl(input: unknown): Promise<string> {
  const parsed = signInInputSchema.safeParse(input);
  const origin = (await headers()).get("origin");

  if (!parsed.success || !origin) {
    throw new InvalidRequestError();
  }

  return startGoogleSignIn({ origin, next: parsed.data.next });
}

export async function signInWithGoogleAction(input: unknown): Promise<ActionFailure> {
  const result = await toActionResult(() => requestSignInUrl(input));

  if (result.ok) {
    redirect(result.data);
  }

  return result;
}

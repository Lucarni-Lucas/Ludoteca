import { z } from "zod";

import { EMAIL_NOT_ALLOWED_CODE } from "@/model/account/errors";
import { safeNextPath } from "@/model/account/next-path";
import {
  classifySignInError,
  SIGN_IN_ERROR_FAILED,
  SIGN_IN_ERROR_NOT_ALLOWED,
  type SignInErrorCode,
} from "@/model/account/sign-in-error";
import { toActionResult } from "@/shared/action-result";

const callbackParamsSchema = z.object({
  code: z.string().trim().min(1).optional(),
  next: z.string().trim().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export type AuthCallbackDependencies = Readonly<{
  exchangeCode(code: string): Promise<string>;
  ensureEmailAllowed(email: string): Promise<void>;
  rejectSession(): Promise<void>;
}>;

function loginWithError(code: SignInErrorCode): string {
  return `/login?error=${code}`;
}

/** Si la verificación no termina bien, por el motivo que sea, la sesión recién creada no sobrevive. */
async function completeSignIn(code: string, deps: AuthCallbackDependencies): Promise<void> {
  const email = await deps.exchangeCode(code);

  try {
    await deps.ensureEmailAllowed(email);
  } catch (error) {
    await deps.rejectSession();
    throw error;
  }
}

/** Decide a qué ruta sigue el navegador. Está separado de route.ts porque Next no admite otras exportaciones ahí. */
export async function resolveAuthCallback(
  searchParams: URLSearchParams,
  deps: AuthCallbackDependencies,
): Promise<string> {
  const parsed = callbackParamsSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return loginWithError(SIGN_IN_ERROR_FAILED);
  }

  const { code, next, error, error_description: errorDescription } = parsed.data;
  const providerError = classifySignInError({ error, errorDescription });
  if (providerError) {
    return loginWithError(providerError);
  }

  if (!code) {
    return loginWithError(SIGN_IN_ERROR_FAILED);
  }

  const result = await toActionResult(() => completeSignIn(code, deps));
  if (result.ok) {
    return safeNextPath(next);
  }

  return loginWithError(result.error.code === EMAIL_NOT_ALLOWED_CODE ? SIGN_IN_ERROR_NOT_ALLOWED : SIGN_IN_ERROR_FAILED);
}

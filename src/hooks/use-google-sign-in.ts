"use client";

import { useRedirectingAction } from "@/hooks/use-redirecting-action";
import type { ActionFailure } from "@/shared/action-result";

export type GoogleSignInAction = (input: { next?: string }) => Promise<ActionFailure>;

type UseGoogleSignInOptions = Readonly<{
  action: GoogleSignInAction;
  next?: string;
  initialErrorMessage: string | null;
}>;

export function useGoogleSignIn({ action, next, initialErrorMessage }: UseGoogleSignInOptions) {
  const { pending, errorMessage, run } = useRedirectingAction(action, initialErrorMessage);

  return { pending, errorMessage, signIn: () => run({ next }) };
}

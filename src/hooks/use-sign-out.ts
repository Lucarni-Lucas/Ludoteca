"use client";

import { useRedirectingAction } from "@/hooks/use-redirecting-action";
import type { ActionFailure } from "@/shared/action-result";

export type SignOutAction = () => Promise<ActionFailure>;

export function useSignOut(action: SignOutAction) {
  const { pending, errorMessage, run } = useRedirectingAction(action);

  return { pending, errorMessage, signOut: run };
}

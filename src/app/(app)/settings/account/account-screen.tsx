"use client";

import { AccountPanel } from "@/components/account/AccountPanel";
import { useSignOut } from "@/hooks/use-sign-out";

import { signOutAction } from "./actions";

export function AccountScreen({ email }: Readonly<{ email: string }>) {
  const { pending, errorMessage, signOut } = useSignOut(signOutAction);

  return <AccountPanel email={email} pending={pending} errorMessage={errorMessage} onSignOut={signOut} />;
}

"use client";

import { useLocale } from "next-intl";

import { AccountPanel } from "@/components/account/AccountPanel";
import { LanguagePicker } from "@/components/account/LanguagePicker";
import { useLocaleChoice } from "@/hooks/use-locale-choice";
import { useSignOut } from "@/hooks/use-sign-out";

import { chooseLocaleAction, signOutAction } from "./actions";

export function AccountScreen({ email }: Readonly<{ email: string }>) {
  const signOut = useSignOut(signOutAction);
  const localeChoice = useLocaleChoice(chooseLocaleAction);
  const locale = useLocale();

  return (
    <AccountPanel
      email={email}
      pending={signOut.pending}
      errorMessage={signOut.errorMessage ?? localeChoice.errorMessage}
      onSignOut={signOut.signOut}
    >
      <LanguagePicker
        value={locale}
        pending={localeChoice.pending}
        change={localeChoice.change}
        onChoose={localeChoice.choose}
      />
    </AccountPanel>
  );
}

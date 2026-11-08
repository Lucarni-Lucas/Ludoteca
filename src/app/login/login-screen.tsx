"use client";

import { LoginCard } from "@/components/account/LoginCard";
import { useGoogleSignIn } from "@/hooks/use-google-sign-in";

import { signInWithGoogleAction } from "./actions";

type LoginScreenProps = Readonly<{
  next?: string;
  initialErrorMessage: string | null;
}>;

export function LoginScreen({ next, initialErrorMessage }: LoginScreenProps) {
  const { pending, errorMessage, signIn } = useGoogleSignIn({
    action: signInWithGoogleAction,
    next,
    initialErrorMessage,
  });

  return <LoginCard pending={pending} errorMessage={errorMessage} onSignIn={signIn} />;
}

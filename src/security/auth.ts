import { cookies } from "next/headers";

import { SignInFailedError, SignOutFailedError } from "@/model/account/errors";
import { safeNextPath } from "@/model/account/next-path";
import { createSupabaseServerClient } from "@/security/supabase-server";
import { logger } from "@/shared/logger";

const AUTH_COOKIE_PREFIX = "sb-";

type OAuthStarter = Readonly<{
  signInWithOAuth(credentials: {
    provider: "google";
    options: { redirectTo: string };
  }): Promise<{ data: { url: string | null }; error: unknown }>;
}>;

type CodeExchanger = Readonly<{
  exchangeCodeForSession(code: string): Promise<{
    data: { user: { email?: string } | null };
    error: unknown;
  }>;
}>;

type SessionCloser = Readonly<{
  signOut(options: { scope: "local" }): Promise<{ error: unknown }>;
}>;

type CookieJar = Readonly<{
  getAll(): readonly { name: string }[];
  delete(name: string): unknown;
}>;

export type GoogleSignInRequest = Readonly<{
  origin: string;
  next?: string;
}>;

export async function requestGoogleSignInUrl(
  auth: OAuthStarter,
  { origin, next }: GoogleSignInRequest,
): Promise<string> {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeNextPath(next));

  const { data, error } = await auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });

  if (error || !data.url) {
    logger.error("El proveedor no devolvió la URL de ingreso", { error });
    throw new SignInFailedError();
  }

  return data.url;
}

export async function exchangeCodeForEmail(auth: CodeExchanger, code: string): Promise<string> {
  const { data, error } = await auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    logger.warn("No se pudo canjear el código de ingreso", { error });
    throw new SignInFailedError();
  }

  return data.user.email;
}

/** Cierra solo este dispositivo: la spec no pide cerrar los demás. */
export async function endSession(auth: SessionCloser): Promise<void> {
  const { error } = await auth.signOut({ scope: "local" });

  if (error) {
    logger.error("No se pudo cerrar la sesión", { error });
    throw new SignOutFailedError();
  }
}

/**
 * Para una cuenta rechazada, no alcanza con pedir el cierre: si Supabase falla, la sesión quedaría
 * guardada en el navegador y el rechazo no tendría efecto. Por eso se borran las cookies igual.
 */
export async function discardRejectedSession(auth: SessionCloser, cookieJar: CookieJar): Promise<void> {
  const { error } = await auth.signOut({ scope: "local" });

  if (error) {
    logger.error("No se pudo cerrar la sesión rechazada; se borran sus cookies", { error });
    cookieJar
      .getAll()
      .filter(({ name }) => name.startsWith(AUTH_COOKIE_PREFIX))
      .forEach(({ name }) => cookieJar.delete(name));
  }
}

export async function startGoogleSignIn(request: GoogleSignInRequest): Promise<string> {
  const client = await createSupabaseServerClient();
  return requestGoogleSignInUrl(client.auth, request);
}

export async function completeCodeExchange(code: string): Promise<string> {
  const client = await createSupabaseServerClient();
  return exchangeCodeForEmail(client.auth, code);
}

export async function signOutCurrentDevice(): Promise<void> {
  const client = await createSupabaseServerClient();
  await endSession(client.auth);
}

export async function rejectCurrentSession(): Promise<void> {
  const client = await createSupabaseServerClient();
  await discardRejectedSession(client.auth, await cookies());
}

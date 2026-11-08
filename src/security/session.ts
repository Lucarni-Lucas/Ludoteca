import { redirect } from "next/navigation";
import { cache } from "react";

import type { SessionUser } from "@/model/account/session-user";
import { createSupabaseReadOnlyClient } from "@/security/supabase-server";
import { logger } from "@/shared/logger";

type Claims = Readonly<{
  sub?: string;
  email?: string;
  user_metadata?: Readonly<Record<string, unknown>>;
}>;

export type ClaimsReader = Readonly<{
  getClaims(): Promise<{ data: { claims: Claims } | null; error: unknown }>;
}>;

function readName(metadata: Claims["user_metadata"]): string | null {
  const name = metadata?.full_name ?? metadata?.name;
  return typeof name === "string" ? name : null;
}

function toSessionUser(claims: Claims): SessionUser | null {
  return claims.sub ? { id: claims.sub, email: claims.email ?? "", name: readName(claims.user_metadata) } : null;
}

/** Usa getClaims porque verifica la firma del token; getSession no valida nada en el servidor. */
export async function readSessionUser(auth: ClaimsReader): Promise<SessionUser | null> {
  const { data, error } = await auth.getClaims();

  if (error) {
    logger.warn("No se pudo validar la sesión", { error });
    return null;
  }

  return data ? toSessionUser(data.claims) : null;
}

/** Con cache, el layout y la página de un mismo pedido comparten una sola verificación. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const client = await createSupabaseReadOnlyClient();
  return readSessionUser(client.auth);
});

/** El proxy no alcanza: un cambio de matcher podría dejar una pantalla o una acción sin cubrir. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

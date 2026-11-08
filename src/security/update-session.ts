import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicEnv } from "@/config/env";
import { resolveAccess } from "@/security/resolve-access";

/** Renueva las cookies de sesión y decide si el pedido sigue o va a la pantalla de ingreso. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const env = getPublicEnv();
  let response = NextResponse.next({ request });

  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        // Se escriben en el pedido y en la respuesta: las pantallas de este pedido ya ven el token nuevo.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  const { data, error } = await client.auth.getClaims();
  const decision = resolveAccess({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    hasSession: !error && Boolean(data?.claims),
  });

  if (decision.action === "allow") {
    return response;
  }

  const redirect = NextResponse.redirect(new URL(decision.location, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

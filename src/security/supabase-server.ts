import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/config/env";

function supabaseCredentials(): [string, string] {
  const env = getPublicEnv();
  return [env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY];
}

/** Para Server Actions y Route Handlers, los únicos lugares donde Next deja escribir cookies. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(...supabaseCredentials(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}

/** Para Server Components: no pueden escribir cookies, y la renovación ya la hace el proxy. */
export async function createSupabaseReadOnlyClient() {
  const cookieStore = await cookies();

  return createServerClient(...supabaseCredentials(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => undefined,
    },
  });
}

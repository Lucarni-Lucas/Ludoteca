import { eq } from "drizzle-orm";

import type { ProviderToken } from "@/model/game/catalog";
import type { Database } from "@/persistence/db";
import { providerToken } from "@/persistence/sql/game/provider-token";

export type ProviderTokenRepository = Readonly<{
  find(provider: string): Promise<ProviderToken | null>;
  save(provider: string, token: ProviderToken): Promise<void>;
}>;

/** El token es de la app y no de un usuario: como el catálogo, no filtra por usuario. */
export function createProviderTokenRepository(db: Database): ProviderTokenRepository {
  return {
    async find(provider) {
      const [row] = await db.select().from(providerToken).where(eq(providerToken.provider, provider)).limit(1);
      return row ? { accessToken: row.accessToken, expiresAt: row.expiresAt.toISOString() } : null;
    },

    async save(provider, token) {
      const values = { accessToken: token.accessToken, expiresAt: new Date(token.expiresAt) };

      await db
        .insert(providerToken)
        .values({ provider, ...values })
        .onConflictDoUpdate({ target: providerToken.provider, set: values });
    },
  };
}

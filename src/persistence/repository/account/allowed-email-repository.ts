import { eq } from "drizzle-orm";

import { normalizeEmail } from "@/model/account/email";
import type { Database } from "@/persistence/db";
import { allowedEmail } from "@/persistence/sql/account/allowed-email";

export type AllowedEmailRepository = Readonly<{
  isAllowed(email: string): Promise<boolean>;
}>;

/** La lista no tiene dueño: es la excepción a «cada consulta filtra por usuario», como el catálogo. */
export function createAllowedEmailRepository(db: Database): AllowedEmailRepository {
  return {
    async isAllowed(email) {
      const rows = await db
        .select({ id: allowedEmail.id })
        .from(allowedEmail)
        .where(eq(allowedEmail.email, normalizeEmail(email)))
        .limit(1);

      return rows.length > 0;
    },
  };
}

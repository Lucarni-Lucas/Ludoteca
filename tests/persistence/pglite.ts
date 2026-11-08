import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

// En Supabase estos roles ya existen, y la migración del hook les da y les quita permisos.
const SUPABASE_ROLES = ["supabase_auth_admin", "anon", "authenticated"];

export type TestDatabase = Readonly<{
  client: PGlite;
  db: PgliteDatabase;
}>;

/** Levanta un Postgres en memoria con las migraciones reales del proyecto. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const client = new PGlite();
  await client.exec(SUPABASE_ROLES.map((role) => `create role ${role} nologin;`).join("\n"));

  const db = drizzle({ client });
  await migrate(db, { migrationsFolder: path.resolve("drizzle") });

  return { client, db };
}

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

let template: Promise<File | Blob> | undefined;

/** Las migraciones corren una sola vez por proceso: cada test parte de una copia recién restaurada. */
async function buildTemplate(): Promise<File | Blob> {
  const client = new PGlite();
  await client.exec(SUPABASE_ROLES.map((role) => `create role ${role} nologin;`).join("\n"));
  await migrate(drizzle({ client }), { migrationsFolder: path.resolve("drizzle") });

  const dump = await client.dumpDataDir("none");
  await client.close();
  return dump;
}

/** Levanta un Postgres en memoria con las migraciones reales del proyecto. */
export async function createTestDatabase(): Promise<TestDatabase> {
  template ??= buildTemplate();

  const client = new PGlite({ loadDataDir: await template });
  return { client, db: drizzle({ client }) };
}

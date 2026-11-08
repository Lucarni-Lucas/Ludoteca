import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/config/env";

/** Lo que usan los repositorios: lo cumplen tanto la conexión real como PGlite en los tests. */
export type Database = PgDatabase<PgQueryResultHKT>;

let database: Database | undefined;

function connect(): Database {
  const { DATABASE_URL, DATABASE_POOL_MAX } = getServerEnv();
  // El transaction pooler de Supabase no admite prepared statements.
  const client = postgres(DATABASE_URL, { prepare: false, max: DATABASE_POOL_MAX });
  return drizzle({ client });
}

export function getDatabase(): Database {
  database ??= connect();
  return database;
}

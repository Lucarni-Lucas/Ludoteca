import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/config/env";

/** Lo que usan los repositorios: lo cumplen tanto la conexión real como PGlite en los tests. */
export type Database = PgDatabase<PgQueryResultHKT>;

/**
 * En globalThis y no en una variable del módulo: Next arma un bundle por tipo de ruta y cada uno
 * tendría su copia de este archivo, con su propio pool, multiplicando las conexiones al pooler.
 */
const processScope = globalThis as typeof globalThis & { ludotecaDatabase?: Database };

function connect(): Database {
  const { DATABASE_URL, DATABASE_POOL_MAX } = getServerEnv();
  const client = postgres(DATABASE_URL, {
    // El transaction pooler de Supabase no admite prepared statements.
    prepare: false,
    max: DATABASE_POOL_MAX,
    // Sin esto, el primer enum de un resultado se busca por otra conexión: con un pool chico, se traba sola.
    fetch_types: false,
  });
  return drizzle({ client });
}

export function getDatabase(): Database {
  processScope.ludotecaDatabase ??= connect();
  return processScope.ludotecaDatabase;
}

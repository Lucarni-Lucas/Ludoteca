import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool, type PoolClient } from "pg";

import { getServerEnv } from "@/config/env";
import { DatabaseUnavailableError } from "@/shared/app-error";
import { logger } from "@/shared/logger";

import { isDatabaseUnavailable } from "./database-error";

/** Lo que usan los repositorios: lo cumplen tanto la conexión real como PGlite en los tests. */
export type Database = PgDatabase<PgQueryResultHKT>;

export type DatabaseSettings = Readonly<{
  url: string;
  poolMax: number;
  connectionTimeoutMs: number;
  queryTimeoutMs: number;
  idleTimeoutMs: number;
}>;

// Con 5 s para conectar y 8 s por consulta, la pantalla avisa con margen antes de los 15 s que pide la spec.
export const DATABASE_TIMEOUTS = {
  connectionTimeoutMs: 5000,
  queryTimeoutMs: 8000,
  idleTimeoutMs: 5000,
} as const;

type AnyFunction = (...args: unknown[]) => unknown;

/** Traduce los errores de un método de pg, tanto en su forma con callback como en la que devuelve una promesa. */
function translateErrors(target: object, method: "connect" | "query", translate: (error: unknown) => unknown): void {
  const record = target as Record<string, AnyFunction>;
  const original = record[method].bind(target);

  record[method] = (...args: unknown[]) => {
    const callback = args.at(-1);

    if (typeof callback === "function") {
      const translated = (error: unknown, ...rest: unknown[]) =>
        (callback as AnyFunction)(error ? translate(error) : error, ...rest);
      return original(...args.slice(0, -1), translated);
    }

    const result = original(...args);
    return result instanceof Promise ? result.catch((error: unknown) => Promise.reject(translate(error))) : result;
  };
}

function toAppError(error: unknown): unknown {
  return isDatabaseUnavailable(error) ? new DatabaseUnavailableError({ cause: error }) : error;
}

type GuardedClient = PoolClient & { releaseAfterFailure?: (error: Error) => void };

/**
 * Drizzle manda el `begin` de una transacción fuera de su try: si falla, nunca devuelve el cliente,
 * y el pool pierde ese lugar para siempre. Lo devuelve este código, y el `release` posterior no hace nada.
 */
function releaseOnceOnFailure(client: GuardedClient): PoolClient {
  const release = client.release.bind(client);
  let released = false;

  const releaseOnce = (error?: Error | boolean) => {
    if (!released) {
      released = true;
      client.releaseAfterFailure = undefined;
      release(error);
    }
  };

  client.release = releaseOnce;
  client.releaseAfterFailure = releaseOnce;
  return client;
}

function guardPoolConnect(pool: Pool): void {
  const record = pool as unknown as Record<string, AnyFunction>;
  const connect = record.connect.bind(pool);

  record.connect = (...args: unknown[]) => {
    const callback = args.at(-1);

    // Con callback lo usa pg-pool para `pool.query`, que ya devuelve el cliente por su cuenta.
    if (typeof callback === "function") {
      return connect((error: unknown, ...rest: unknown[]) => (callback as AnyFunction)(error ? toAppError(error) : error, ...rest));
    }

    return (connect() as Promise<GuardedClient>).then(releaseOnceOnFailure, (error: unknown) =>
      Promise.reject(toAppError(error)),
    );
  };
}

/** pg deja activa una consulta que venció: si el cliente volviera al pool, el pedido siguiente la heredaría. */
function guardClient(client: GuardedClient): void {
  translateErrors(client, "query", (error) => {
    if (!isDatabaseUnavailable(error)) {
      return error;
    }

    const unavailable = new DatabaseUnavailableError({ cause: error });
    client.end().catch((endError: unknown) => logger.warn("No se pudo cerrar una conexión trabada", { error: endError }));
    client.releaseAfterFailure?.(unavailable);
    return unavailable;
  });
}

export function createDatabase(settings: DatabaseSettings): Database {
  const pool = new Pool({
    connectionString: settings.url,
    max: settings.poolMax,
    connectionTimeoutMillis: settings.connectionTimeoutMs,
    idleTimeoutMillis: settings.idleTimeoutMs,
    // El único tope garantizado: Supavisor descarta statement_timeout y cualquier parámetro de sesión.
    query_timeout: settings.queryTimeoutMs,
    keepAlive: true,
  });

  // Sin este listener, un cliente ocioso que pierde la conexión tira abajo el proceso.
  pool.on("error", (error) => logger.warn("Se cortó una conexión ociosa a la base", { error }));
  pool.on("connect", guardClient);
  guardPoolConnect(pool);
  // Cierra las conexiones ociosas antes de que Vercel suspenda la instancia; fuera de Vercel no hace nada.
  attachDatabasePool(pool);

  return drizzle({ client: pool });
}

/**
 * En globalThis y no en una variable del módulo: Next arma un bundle por tipo de ruta y cada uno
 * tendría su copia de este archivo, con su propio pool, multiplicando las conexiones al pooler.
 */
const processScope = globalThis as typeof globalThis & { ludotecaDatabase?: Database };

export function getDatabase(): Database {
  if (!processScope.ludotecaDatabase) {
    const { DATABASE_URL, DATABASE_POOL_MAX } = getServerEnv();
    processScope.ludotecaDatabase = createDatabase({ url: DATABASE_URL, poolMax: DATABASE_POOL_MAX, ...DATABASE_TIMEOUTS });
  }

  return processScope.ludotecaDatabase;
}

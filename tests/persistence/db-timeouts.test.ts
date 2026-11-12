import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDatabase, type Database, DATABASE_TIMEOUTS } from "@/persistence/db";
import { isDatabaseUnavailable } from "@/persistence/database-error";
import { DatabaseUnavailableError } from "@/shared/app-error";
import { logger } from "@/shared/logger";

import { createTestDatabase, type TestDatabase } from "./pglite";
import { type StallablePooler, startStallablePooler } from "./support/stallable-pooler";
import { type StalledPostgres, startStalledPostgres } from "./support/stalled-postgres";

const processScope = globalThis as typeof globalThis & { ludotecaDatabase?: unknown };
// La spec pide avisar antes de 15 s; la consulta corta a los 8 s.
const SPEC_LIMIT_MS = 15_000;
const SLOW_TEST_MS = 20_000;
const SHORT_TIMEOUT_MS = 300;
const PROXY_TEST_MS = 15_000;
// Como en producción: varias conexiones de la app sobre la única de PGlite.
const POOL_MAX = 3;
const UNAVAILABLE_CODE = new DatabaseUnavailableError().code;
// Margen para el arranque del cliente y del proxy en una máquina cargada.
const SHORT_LIMIT_MS = 3000;

type QueryRows = Readonly<{ rows: unknown[] }>;

function causes(error: unknown): unknown[] {
  const chain: unknown[] = [];

  for (let current = error; current instanceof Error && chain.length < 10; current = current.cause) {
    chain.push(current);
  }

  return chain;
}

function failureOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error: unknown) => error,
  );
}

/** Por código y no con instanceof: el primer test recarga los módulos, y con ellos la clase del error. */
function expectUnavailable(error: unknown): void {
  expect(causes(error).some((cause) => (cause as { code?: unknown }).code === UNAVAILABLE_CODE)).toBe(true);
}

function shortDatabase(url: string, poolMax = 1): Database {
  return createDatabase({
    url,
    poolMax,
    connectionTimeoutMs: SHORT_TIMEOUT_MS,
    queryTimeoutMs: SHORT_TIMEOUT_MS,
    idleTimeoutMs: DATABASE_TIMEOUTS.idleTimeoutMs,
  });
}

describe("base que no responde", () => {
  let stalled: StalledPostgres | undefined;

  afterEach(async () => {
    delete processScope.ludotecaDatabase;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await stalled?.close();
    stalled = undefined;
  });

  it(
    "una consulta a una base trabada falla con DatabaseUnavailableError en lugar de esperar",
    { timeout: SLOW_TEST_MS },
    async () => {
      stalled = await startStalledPostgres();
      delete processScope.ludotecaDatabase;
      vi.stubEnv("DATABASE_URL", stalled.url);
      vi.resetModules();
      const { getDatabase } = await import("@/persistence/db");
      const started = Date.now();

      const failure = await failureOf(getDatabase().execute(sql`select 1`));

      expectUnavailable(failure);
      expect(Date.now() - started).toBeLessThan(SPEC_LIMIT_MS);
    },
  );

  it("no conectar falla por el tiempo máximo de conexión", async () => {
    stalled = await startStalledPostgres("before-handshake");
    const database = shortDatabase(stalled.url);
    const started = Date.now();

    const failure = await failureOf(database.execute(sql`select 1`));

    expectUnavailable(failure);
    expect(Date.now() - started).toBeLessThan(SHORT_LIMIT_MS);
  });
});

describe("después de un fallo, la base vuelve a andar", () => {
  let healthy: TestDatabase;
  let socketServer: PGLiteSocketServer;
  let proxy: StallablePooler;
  let database: Database;

  async function setup(): Promise<void> {
    vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    healthy = await createTestDatabase();
    socketServer = new PGLiteSocketServer({ db: healthy.client, port: 0, host: "127.0.0.1" });
    await socketServer.start();
    const socketPort = Number(/:(\d+)$/.exec(socketServer.getServerConn())?.[1]);
    proxy = await startStallablePooler(socketPort);
    database = shortDatabase(`postgresql://postgres:postgres@127.0.0.1:${proxy.port}/postgres`, POOL_MAX);
    await database.execute(sql`select 1`);
  }

  afterEach(async () => {
    vi.restoreAllMocks();
    await proxy?.close();
    await socketServer?.stop();
    await healthy?.client.close();
  });

  it("la consulta siguiente no hereda el cliente trabado", { timeout: PROXY_TEST_MS }, async () => {
    await setup();
    proxy.stall();
    const failure = await failureOf(database.execute(sql`select 1`));
    proxy.resume();

    const result = (await database.execute(sql`select 2 as dos`)) as QueryRows;

    expectUnavailable(failure);
    expect(result.rows).toEqual([{ dos: 2 }]);
  });

  it("una transacción trabada falla una sola vez y la siguiente anda", { timeout: PROXY_TEST_MS }, async () => {
    await setup();
    proxy.stall();
    const started = Date.now();
    const failure = await failureOf(database.transaction((tx) => tx.execute(sql`select 1`)));
    const elapsed = Date.now() - started;
    proxy.resume();

    const result = (await database.transaction((tx) => tx.execute(sql`select 3 as tres`))) as QueryRows;

    expectUnavailable(failure);
    // El rollback no vuelve a esperar el tiempo máximo: el cliente trabado ya se cerró.
    expect(elapsed).toBeLessThan(SHORT_LIMIT_MS);
    expect(result.rows).toEqual([{ tres: 3 }]);
  });

  it("varias consultas y transacciones a la vez comparten la única conexión de PGlite", { timeout: PROXY_TEST_MS }, async () => {
    await setup();
    // Verifica que se comparte la conexión, no los tiempos: con 300 ms, un CI cargado vence la espera en la fila (design.md §17).
    const shared = createDatabase({
      url: `postgresql://postgres:postgres@127.0.0.1:${proxy.port}/postgres`,
      poolMax: POOL_MAX,
      ...DATABASE_TIMEOUTS,
    });
    const queries = Array.from({ length: 6 }, (_, index) =>
      index % 2 === 0
        ? shared.execute(sql`select ${index}::int as n`)
        : shared.transaction(async (tx) => {
            await tx.execute(sql`select 1`);
            return tx.execute(sql`select ${index}::int as n`);
          }),
    );

    const results = (await Promise.all(queries)) as QueryRows[];

    expect(results.map(({ rows }) => rows)).toEqual([0, 1, 2, 3, 4, 5].map((n) => [{ n }]));
  });

  it("un pedido trabado no hace esperar a uno nuevo", { timeout: PROXY_TEST_MS }, async () => {
    await setup();
    proxy.stall();
    const stuck = failureOf(database.execute(sql`select 1`));
    await vi.waitFor(() => expect(proxy.frozenConnections()).toBe(1));
    proxy.resume();
    const started = Date.now();

    const result = (await database.execute(sql`select 4 as cuatro`)) as QueryRows;

    expect(Date.now() - started).toBeLessThan(SHORT_TIMEOUT_MS);
    expect(result.rows).toEqual([{ cuatro: 4 }]);
    expectUnavailable(await stuck);
  });

  it("un error de la consulta no se confunde con una base caída", { timeout: PROXY_TEST_MS }, async () => {
    await setup();

    const failure = await failureOf(database.execute(sql`select * from tabla_que_no_existe`));

    expect(isDatabaseUnavailable(failure)).toBe(false);
    expect(causes(failure).some((cause) => (cause as { code?: unknown }).code === UNAVAILABLE_CODE)).toBe(false);
  });
});

describe("isDatabaseUnavailable", () => {
  function withCode(code: string): Error {
    return Object.assign(new Error("error de la base"), { code });
  }

  it.each([
    { description: "un statement_timeout (57014)", error: withCode("57014") },
    { description: "una excepción de conexión (08006)", error: withCode("08006") },
    { description: "un socket cortado", error: withCode("ECONNRESET") },
    { description: "el tiempo máximo de consulta de pg", error: new Error("Query read timeout") },
    { description: "un error envuelto por Drizzle", error: new Error("Failed query", { cause: new Error("Query read timeout") }) },
  ])("reconoce $description", ({ error }) => {
    const value = error;

    const unavailable = isDatabaseUnavailable(value);

    expect(unavailable).toBe(true);
  });

  it.each([
    { description: "una violación de unicidad (23505)", error: withCode("23505") },
    { description: "un error común", error: new Error("otra cosa") },
    { description: "algo que no es un error", error: "texto" },
  ])("no confunde $description", ({ error }) => {
    const value = error;

    const unavailable = isDatabaseUnavailable(value);

    expect(unavailable).toBe(false);
  });
});

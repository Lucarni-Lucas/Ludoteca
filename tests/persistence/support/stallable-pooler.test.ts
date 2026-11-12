import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { Client } from "pg";
import { afterEach, describe, expect, it } from "vitest";

import { createTestDatabase, type TestDatabase } from "../pglite";
import { type StallablePooler, startStallablePooler } from "./stallable-pooler";

const EMAIL = "nueva@ludoteca.test";
// Levantar PGlite con las migraciones reales tarda más que los 5 s por defecto de Vitest.
const POOLER_TEST_MS = 15_000;

describe("startStallablePooler", () => {
  let database: TestDatabase;
  let socketServer: PGLiteSocketServer;
  let pooler: StallablePooler;
  const clients: Client[] = [];

  async function connect(): Promise<Client> {
    const client = new Client({ connectionString: `postgresql://postgres:postgres@127.0.0.1:${pooler.port}/postgres` });
    await client.connect();
    clients.push(client);
    return client;
  }

  async function setup(): Promise<void> {
    database = await createTestDatabase();
    socketServer = new PGLiteSocketServer({ db: database.client, port: 0, host: "127.0.0.1" });
    await socketServer.start();
    pooler = await startStallablePooler(Number(/:(\d+)$/.exec(socketServer.getServerConn())?.[1]));
  }

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.end()));
    await pooler?.close();
    await socketServer?.stop();
    await database?.client.close();
  });

  it("una consulta de otra conexión espera a que termine la transacción abierta y su rollback no se la lleva", { timeout: POOLER_TEST_MS }, async () => {
    await setup();
    const app = await connect();
    const control = await connect();
    await app.query("begin");
    await app.query("select 1");

    const insert = control.query("insert into allowed_email (email) values ($1)", [EMAIL]);
    await app.query("rollback");
    await insert;

    const { rows } = await control.query("select count(*)::int as n from allowed_email where email = $1", [EMAIL]);
    expect(rows).toEqual([{ n: 1 }]);
  });
});

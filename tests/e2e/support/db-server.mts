// Base de los e2e: PGlite con las migraciones reales, expuesto por socket para que la app se conecte sin Docker.
// pglite-socket admite una sola conexión, así que la app entra por un pooler en modo transacción, como Supavisor.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

import { createTestDatabase } from "../../persistence/pglite.ts";
import { startStallablePooler } from "../../persistence/support/stallable-pooler.ts";
import {
  ALLOW_ACCOUNT_PATH,
  ALLOWED_ACCOUNT,
  DATABASE_STATUS_PATH,
  DB_CONTROL_PORT,
  DB_INTERNAL_PORT,
  DB_PORT,
  RESUME_DATABASE_PATH,
  STALL_DATABASE_PATH,
} from "./constants.ts";

const HTTP_NO_CONTENT = 204;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;

const { client } = await createTestDatabase();
await client.query("insert into allowed_email (email) values ($1)", [ALLOWED_ACCOUNT.email]);

const socketServer = new PGLiteSocketServer({ db: client, port: DB_INTERNAL_PORT, host: "127.0.0.1" });
await socketServer.start();
const pooler = await startStallablePooler(DB_INTERNAL_PORT, DB_PORT);

function reply(response: ServerResponse, status: number, body = ""): void {
  response.writeHead(status, body ? { "content-type": "application/json" } : {});
  response.end(body);
}

/** Cada test nuevo usa una cuenta propia. Esto convive con la app porque PGlite serializa sus consultas. */
function allowAccount(url: URL, response: ServerResponse): void {
  const email = url.searchParams.get("email") ?? "";

  if (email === "") {
    reply(response, HTTP_NOT_FOUND);
    return;
  }

  client
    .query("insert into allowed_email (email) values ($1) on conflict do nothing", [email])
    .then(() => reply(response, HTTP_NO_CONTENT))
    .catch((error: unknown) => reply(response, HTTP_SERVER_ERROR, JSON.stringify({ error: String(error) })));
}

function route(request: IncomingMessage, response: ServerResponse): void {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  switch (url.pathname) {
    case ALLOW_ACCOUNT_PATH:
      return allowAccount(url, response);
    case STALL_DATABASE_PATH:
      pooler.stall();
      return reply(response, HTTP_NO_CONTENT);
    case RESUME_DATABASE_PATH:
      pooler.resume();
      return reply(response, HTTP_NO_CONTENT);
    case DATABASE_STATUS_PATH:
      return reply(response, 200, JSON.stringify({ frozenConnections: pooler.frozenConnections() }));
    default:
      return reply(response, HTTP_NOT_FOUND);
  }
}

createServer(route).listen(DB_CONTROL_PORT, "127.0.0.1");

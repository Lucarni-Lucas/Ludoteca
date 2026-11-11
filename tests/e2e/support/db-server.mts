// Base de los e2e: PGlite con las migraciones reales, expuesto por socket para que la app se conecte sin Docker.
import { createServer } from "node:http";

import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

import { createTestDatabase } from "../../persistence/pglite.ts";
import { ALLOW_ACCOUNT_PATH, ALLOWED_ACCOUNT, DB_CONTROL_PORT, DB_PORT } from "./constants.ts";

const { client } = await createTestDatabase();
await client.query("insert into allowed_email (email) values ($1)", [ALLOWED_ACCOUNT.email]);

const server = new PGLiteSocketServer({ db: client, port: DB_PORT, host: "127.0.0.1" });
await server.start();

// Cada test nuevo usa una cuenta propia. pglite-socket serializa por consulta, así que esto convive con la app.
createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const email = url.searchParams.get("email") ?? "";

  if (url.pathname !== ALLOW_ACCOUNT_PATH || email === "") {
    response.writeHead(404);
    response.end();
    return;
  }

  client
    .query("insert into allowed_email (email) values ($1) on conflict do nothing", [email])
    .then(() => {
      response.writeHead(204);
      response.end();
    })
    .catch((error: unknown) => {
      response.writeHead(500);
      response.end(String(error));
    });
}).listen(DB_CONTROL_PORT, "127.0.0.1");

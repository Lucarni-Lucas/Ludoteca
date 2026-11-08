// Base de los e2e: PGlite con las migraciones reales, expuesto por socket para que la app se conecte sin Docker.
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

import { createTestDatabase } from "../../persistence/pglite.ts";
import { ALLOWED_ACCOUNT, DB_PORT } from "./constants.ts";

const { client } = await createTestDatabase();
await client.query("insert into allowed_email (email) values ($1)", [ALLOWED_ACCOUNT.email]);

const server = new PGLiteSocketServer({ db: client, port: DB_PORT, host: "127.0.0.1" });
await server.start();

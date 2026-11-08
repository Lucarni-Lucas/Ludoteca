import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

const LOCAL_ENV_FILE = ".env.local";

// drizzle-kit no lee .env.local por su cuenta, y `generate` tiene que poder correr sin ese archivo.
if (existsSync(LOCAL_ENV_FILE)) {
  process.loadEnvFile(LOCAL_ENV_FILE);
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/persistence/sql/**/*.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL ?? "",
  },
});

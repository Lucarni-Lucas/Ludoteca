import { defineConfig } from "@playwright/test";

import {
  APP_PORT,
  APP_URL,
  AUTH_PORT,
  AUTH_URL,
  DB_CONTROL_PORT,
  DB_URL,
  IGDB_PORT,
  IGDB_URL,
} from "./tests/e2e/support/constants.ts";

const BUILD_AND_START_TIMEOUT_MS = 5 * 60 * 1000;
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  // El servidor de Auth falso guarda en memoria con qué cuenta se «ingresa».
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
  },
  projects: [
    // Los tests con @desktop o @mobile describen algo que solo existe en ese ancho.
    // En inglés corren solo los de idioma (@i18n): el resto de la app ya se recorre en español (design.md §13).
    { name: "mobile-es", grepInvert: [/@desktop/, /@i18n/], use: { viewport: MOBILE, locale: "es-AR" } },
    { name: "desktop-es", grepInvert: [/@mobile/, /@i18n/], use: { viewport: DESKTOP, locale: "es-AR" } },
    { name: "mobile-en", grep: /@i18n/, grepInvert: /@desktop/, use: { viewport: MOBILE, locale: "en-US" } },
    { name: "desktop-en", grep: /@i18n/, grepInvert: /@mobile/, use: { viewport: DESKTOP, locale: "en-US" } },
  ],
  webServer: [
    {
      command: "node tests/e2e/support/db-server.mts",
      port: DB_CONTROL_PORT,
      reuseExistingServer: false,
    },
    {
      command: "node tests/e2e/support/auth-server.mts",
      port: AUTH_PORT,
      reuseExistingServer: false,
    },
    {
      command: "node tests/e2e/support/igdb-server.mts",
      port: IGDB_PORT,
      reuseExistingServer: false,
    },
    {
      // Con el build de producción: las variables públicas se fijan al compilar, y es lo que se despliega.
      command: `npx next build && npx next start -p ${APP_PORT}`,
      url: `${APP_URL}/login`,
      timeout: BUILD_AND_START_TIMEOUT_MS,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: AUTH_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_e2e",
        DATABASE_URL: DB_URL,
        // Como en producción: el pooler de db-server.mts reparte la única conexión de PGlite.
        DATABASE_POOL_MAX: "10",
        TWITCH_CLIENT_ID: "cliente-e2e",
        TWITCH_CLIENT_SECRET: "secreto-e2e",
        IGDB_API_URL: `${IGDB_URL}/v4`,
        TWITCH_TOKEN_URL: `${IGDB_URL}/token`,
      },
    },
  ],
});

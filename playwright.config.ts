import { defineConfig } from "@playwright/test";

import { APP_PORT, APP_URL, AUTH_PORT, AUTH_URL, DB_PORT, DB_URL } from "./tests/e2e/support/constants.ts";

const BUILD_AND_START_TIMEOUT_MS = 5 * 60 * 1000;

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
    { name: "mobile", grepInvert: /@desktop/, use: { viewport: { width: 390, height: 844 } } },
    { name: "desktop", grepInvert: /@mobile/, use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: "node tests/e2e/support/db-server.mts",
      port: DB_PORT,
      reuseExistingServer: false,
    },
    {
      command: "node tests/e2e/support/auth-server.mts",
      port: AUTH_PORT,
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
        DATABASE_POOL_MAX: "1",
      },
    },
  ],
});

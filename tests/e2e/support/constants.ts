export const APP_PORT = 3100;
export const AUTH_PORT = 54399;
export const DB_PORT = 54398;
export const IGDB_PORT = 54397;
export const DB_CONTROL_PORT = 54396;
// pglite-socket, detrás del pooler que escucha en DB_PORT.
export const DB_INTERNAL_PORT = 54395;

export const APP_URL = `http://localhost:${APP_PORT}`;
export const AUTH_URL = `http://127.0.0.1:${AUTH_PORT}`;
export const DB_URL = `postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres`;
export const IGDB_URL = `http://127.0.0.1:${IGDB_PORT}`;
export const DB_CONTROL_URL = `http://127.0.0.1:${DB_CONTROL_PORT}`;

export const SIGN_IN_AS_PATH = "/__test/sign-in-as";
export const ALLOW_ACCOUNT_PATH = "/__test/allow-account";
export const STALL_DATABASE_PATH = "/__test/stall-database";
export const RESUME_DATABASE_PATH = "/__test/resume-database";
export const DATABASE_STATUS_PATH = "/__test/database-status";

export const ALLOWED_ACCOUNT = { email: "permitido@ludoteca.test", name: "Lucía Prueba" };
export const OTHER_ACCOUNT = { email: "ajeno@ludoteca.test", name: "Alguien Ajeno" };

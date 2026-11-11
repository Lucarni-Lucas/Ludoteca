import { z } from "zod";

const DEFAULT_DATABASE_POOL_MAX = 3;

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(DEFAULT_DATABASE_POOL_MAX),
});

const DEFAULT_IGDB_API_URL = "https://api.igdb.com/v4";
const DEFAULT_TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";

// Van aparte de serverEnvSchema: sin estas credenciales, la biblioteca tiene que seguir andando.
const igdbEnvSchema = z.object({
  TWITCH_CLIENT_ID: z.string().min(1),
  TWITCH_CLIENT_SECRET: z.string().min(1),
  IGDB_API_URL: z.url().default(DEFAULT_IGDB_API_URL),
  TWITCH_TOKEN_URL: z.url().default(DEFAULT_TWITCH_TOKEN_URL),
});

const storageEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type IgdbEnv = z.infer<typeof igdbEnvSchema>;
export type StorageEnv = z.infer<typeof storageEnvSchema>;

type EnvSource = Readonly<Record<string, string | undefined>>;

function describeIssues(error: z.ZodError): string {
  return error.issues.map((issue) => issue.path.join(".")).join(", ");
}

function parseEnv<T>(schema: z.ZodType<T>, source: EnvSource): T {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Variables de entorno inválidas o faltantes: ${describeIssues(parsed.error)}`);
  }
  return parsed.data;
}

export function parsePublicEnv(source: EnvSource): PublicEnv {
  return parseEnv(publicEnvSchema, source);
}

export function parseServerEnv(source: EnvSource): ServerEnv {
  return parseEnv(serverEnvSchema, source);
}

export function parseIgdbEnv(source: EnvSource): IgdbEnv {
  return parseEnv(igdbEnvSchema, source);
}

export function parseStorageEnv(source: EnvSource): StorageEnv {
  return parseEnv(storageEnvSchema, source);
}

let cachedPublicEnv: PublicEnv | undefined;
let cachedServerEnv: ServerEnv | undefined;
let cachedIgdbEnv: IgdbEnv | undefined;
let cachedStorageEnv: StorageEnv | undefined;

export function getPublicEnv(): PublicEnv {
  cachedPublicEnv ??= parsePublicEnv({
    // Next solo reemplaza estas variables si se las nombra literalmente.
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cachedPublicEnv;
}

export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= parseServerEnv(process.env);
  return cachedServerEnv;
}

export function getIgdbEnv(): IgdbEnv {
  cachedIgdbEnv ??= parseIgdbEnv(process.env);
  return cachedIgdbEnv;
}

/** La secret key tiene acceso total: se lee solo acá y la usa únicamente el adapter de Storage. */
export function getStorageEnv(): StorageEnv {
  cachedStorageEnv ??= parseStorageEnv(process.env);
  return cachedStorageEnv;
}

import { z } from "zod";

// Supavisor reparte estas conexiones: una pantalla trabada no deja sin lugar al resto (design.md §17).
const DEFAULT_DATABASE_POOL_MAX = 10;

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

const DEFAULT_STEAM_API_URL = "https://api.steampowered.com";

// Aparte, como IGDB: sin la clave de Steam, el resto de la app y las otras fuentes de importación andan.
const steamEnvSchema = z.object({
  STEAM_API_KEY: z.string().min(1),
  STEAM_API_URL: z.url().default(DEFAULT_STEAM_API_URL),
});

const storageEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type IgdbEnv = z.infer<typeof igdbEnvSchema>;
export type StorageEnv = z.infer<typeof storageEnvSchema>;
export type SteamEnv = z.infer<typeof steamEnvSchema>;

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

export function parseSteamEnv(source: EnvSource): SteamEnv {
  return parseEnv(steamEnvSchema, source);
}

let cachedPublicEnv: PublicEnv | undefined;
let cachedServerEnv: ServerEnv | undefined;
let cachedIgdbEnv: IgdbEnv | undefined;
let cachedStorageEnv: StorageEnv | undefined;
let cachedSteamEnv: SteamEnv | undefined;

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

/** La clave viaja en la query de cada pedido a Steam: solo la lee el adapter de Steam, que nunca registra URLs. */
export function getSteamEnv(): SteamEnv {
  cachedSteamEnv ??= parseSteamEnv(process.env);
  return cachedSteamEnv;
}

/** Como `getSteamEnv`, pero sin la clave devuelve `null`: que falte no es un error, la pantalla lo dice. */
export function findSteamEnv(): SteamEnv | null {
  if (cachedSteamEnv) {
    return cachedSteamEnv;
  }

  const parsed = steamEnvSchema.safeParse(process.env);

  if (parsed.success) {
    cachedSteamEnv = parsed.data;
  }

  return cachedSteamEnv ?? null;
}

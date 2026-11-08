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

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

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

let cachedPublicEnv: PublicEnv | undefined;
let cachedServerEnv: ServerEnv | undefined;

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

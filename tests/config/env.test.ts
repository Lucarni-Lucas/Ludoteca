import { describe, expect, it } from "vitest";

import { parsePublicEnv, parseServerEnv } from "@/config/env";

const validPublic = {
  NEXT_PUBLIC_SUPABASE_URL: "https://proyecto.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
};

describe("parsePublicEnv", () => {
  it("devuelve las variables públicas cuando son válidas", () => {
    const source = validPublic;

    const env = parsePublicEnv(source);

    expect(env).toEqual(validPublic);
  });

  it("nombra la variable que falta", () => {
    const source = { NEXT_PUBLIC_SUPABASE_URL: validPublic.NEXT_PUBLIC_SUPABASE_URL };

    const parse = () => parsePublicEnv(source);

    expect(parse).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("rechaza una URL inválida", () => {
    const source = { ...validPublic, NEXT_PUBLIC_SUPABASE_URL: "no-es-una-url" };

    const parse = () => parsePublicEnv(source);

    expect(parse).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("no acepta una key vacía", () => {
    const source = { ...validPublic, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" };

    const parse = () => parsePublicEnv(source);

    expect(parse).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("no incluye variables de servidor aunque estén definidas", () => {
    const source = { ...validPublic, DATABASE_URL: "postgresql://secreto@host/db" };

    const env = parsePublicEnv(source);

    expect(env).not.toHaveProperty("DATABASE_URL");
  });
});

describe("parseServerEnv", () => {
  const databaseUrl = "postgresql://usuario:clave@host:6543/postgres";

  it("usa el tamaño de pool por defecto cuando no está definido", () => {
    const source = { DATABASE_URL: databaseUrl };

    const env = parseServerEnv(source);

    expect(env).toEqual({ DATABASE_URL: databaseUrl, DATABASE_POOL_MAX: 3 });
  });

  it("convierte a número el tamaño de pool", () => {
    const source = { DATABASE_URL: databaseUrl, DATABASE_POOL_MAX: "1" };

    const env = parseServerEnv(source);

    expect(env.DATABASE_POOL_MAX).toBe(1);
  });

  it("nombra la variable que falta", () => {
    const source = {};

    const parse = () => parseServerEnv(source);

    expect(parse).toThrow(/DATABASE_URL/);
  });

  it("rechaza una URL inválida sin mostrar su contenido", () => {
    const source = { DATABASE_URL: "clave-secreta-sin-formato" };

    const parse = () => parseServerEnv(source);

    expect(parse).toThrow(/DATABASE_URL/);
    expect(parse).not.toThrow(/clave-secreta/);
  });

  it("rechaza un tamaño de pool que no sea positivo", () => {
    const source = { DATABASE_URL: databaseUrl, DATABASE_POOL_MAX: "0" };

    const parse = () => parseServerEnv(source);

    expect(parse).toThrow(/DATABASE_POOL_MAX/);
  });
});

import { describe, expect, it } from "vitest";

import { parseIgdbEnv, parseStorageEnv } from "@/config/env";

describe("parseIgdbEnv", () => {
  const credentials = { TWITCH_CLIENT_ID: "cliente", TWITCH_CLIENT_SECRET: "secreto" };

  it("usa las URLs oficiales cuando no están definidas", () => {
    const source = credentials;

    const env = parseIgdbEnv(source);

    expect(env).toEqual({
      ...credentials,
      IGDB_API_URL: "https://api.igdb.com/v4",
      TWITCH_TOKEN_URL: "https://id.twitch.tv/oauth2/token",
    });
  });

  it("acepta las URLs del servidor falso de e2e", () => {
    const source = {
      ...credentials,
      IGDB_API_URL: "http://localhost:4010/v4",
      TWITCH_TOKEN_URL: "http://localhost:4010/token",
    };

    const env = parseIgdbEnv(source);

    expect(env.IGDB_API_URL).toBe("http://localhost:4010/v4");
    expect(env.TWITCH_TOKEN_URL).toBe("http://localhost:4010/token");
  });

  it.each(["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET"] as const)("nombra %s cuando falta", (variable) => {
    const source = { ...credentials, [variable]: undefined };

    const parse = () => parseIgdbEnv(source);

    expect(parse).toThrow(new RegExp(variable));
  });
});

describe("parseStorageEnv", () => {
  const url = "https://proyecto.supabase.co";

  it("devuelve la URL del proyecto y la secret key", () => {
    const source = { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: "sb_secret_abc" };

    const env = parseStorageEnv(source);

    expect(env).toEqual(source);
  });

  it("nombra la secret key cuando falta, sin mostrar otros valores", () => {
    const source = { NEXT_PUBLIC_SUPABASE_URL: url };

    const parse = () => parseStorageEnv(source);

    expect(parse).toThrow(/SUPABASE_SECRET_KEY/);
    expect(parse).not.toThrow(/proyecto\.supabase/);
  });
});

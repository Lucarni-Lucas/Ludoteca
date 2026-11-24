import { describe, expect, it } from "vitest";

import { parseSteamEnv } from "@/config/env";

describe("parseSteamEnv", () => {
  it("devuelve la clave y la URL que se le pasan", () => {
    const source = { STEAM_API_KEY: "clave-de-steam", STEAM_API_URL: "http://localhost:4020" };

    const env = parseSteamEnv(source);

    expect(env).toEqual(source);
  });

  it("usa la URL oficial de la Steam Web API cuando no está definida", () => {
    const source = { STEAM_API_KEY: "clave-de-steam" };

    const env = parseSteamEnv(source);

    expect(env.STEAM_API_URL).toBe("https://api.steampowered.com");
  });

  it("nombra STEAM_API_KEY cuando falta, sin mostrar otros valores", () => {
    const source = { STEAM_API_URL: "http://servidor-falso.test" };

    const parse = () => parseSteamEnv(source);

    expect(parse).toThrow(/STEAM_API_KEY/);
    expect(parse).not.toThrow(/servidor-falso/);
  });

  it("rechaza una clave vacía", () => {
    const source = { STEAM_API_KEY: "" };

    const parse = () => parseSteamEnv(source);

    expect(parse).toThrow(/STEAM_API_KEY/);
  });
});

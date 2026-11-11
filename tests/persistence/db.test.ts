import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const processScope = globalThis as typeof globalThis & { ludotecaDatabase?: unknown };

describe("getDatabase", () => {
  beforeEach(() => {
    delete processScope.ludotecaDatabase;
    vi.stubEnv("DATABASE_URL", "postgresql://usuario:clave@localhost:5432/postgres");
    vi.resetModules();
  });

  afterEach(() => {
    delete processScope.ludotecaDatabase;
    vi.unstubAllEnvs();
  });

  it("comparte una sola conexión aunque el módulo se cargue dos veces, como pasa entre bundles de Next", async () => {
    const first = await import("@/persistence/db");
    vi.resetModules();
    const second = await import("@/persistence/db");

    const database = first.getDatabase();

    expect(second.getDatabase()).toBe(database);
  });
});

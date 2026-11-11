import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { KNOWN_STORE_NAMES, storeSlug } from "@/model/store/store";
import { store } from "@/persistence/sql/store/store";

import { createTestDatabase, type TestDatabase } from "../../pglite";

const SEED_FILE = path.resolve("drizzle/0003_seed_known_stores.sql");

describe("tiendas conocidas", () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  afterEach(async () => {
    await database.client.close();
  });

  it("existen las 12, sin dueño y con el slug que calcula el modelo", async () => {
    const expected = KNOWN_STORE_NAMES.map((name) => ({ name, slug: storeSlug(name), userId: null }));

    const rows = await database.db.select({ name: store.name, slug: store.slug, userId: store.userId }).from(store);

    expect(rows).toHaveLength(12);
    expect(rows).toEqual(expect.arrayContaining(expected));
  });

  it("repetir el insert no las duplica", async () => {
    const seed = readFileSync(SEED_FILE, "utf8");

    await database.client.exec(seed);

    const [{ count }] = await database.db.select({ count: sql<number>`count(*)::int` }).from(store);
    expect(count).toBe(12);
  });
});

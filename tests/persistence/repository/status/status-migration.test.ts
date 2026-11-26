import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { USER_A, USER_B } from "../users";

// La última migración antes del paso a los estados nuevos (design.md §21).
const LAST_BEFORE = "0010_add_import_item_chosen_igdb_id";
const SUPABASE_ROLES = ["supabase_auth_admin", "anon", "authenticated"];
const MIGRATIONS = path.resolve("drizzle");

// Los estados de fábrica como eran antes de este cambio, con «Sin fin» y «Pendiente».
const OLD_STATUSES = [
  ["in_progress", "Jugando", "lime", 1, "playing"],
  ["in_progress", "En pausa", "lime", 2, "paused"],
  ["in_progress", "Sin fin", "lime", 3, "endless"],
  ["not_started", "Quiero jugarlo", "amber", 1, "wishlist"],
  ["not_started", "Pendiente", "gray", 2, "backlog"],
  ["finished", "Completado", "blue", 1, "completed"],
  ["finished", "100%", "blue", 2, "hundred_percent"],
  ["finished", "Jugado", "blue", 3, "played"],
  ["dropped", "Abandonado", "coral", 1, "abandoned"],
  ["dropped", "Lo probé", "coral", 2, "tried"],
] as const;

type Row = Record<string, unknown>;

/** Una copia de `drizzle/` con el journal cortado: así se aplica la base tal como estaba antes del paso. */
function migrationsUpTo(tag: string): string {
  const folder = mkdtempSync(path.join(tmpdir(), "ludoteca-migraciones-"));
  cpSync(MIGRATIONS, folder, { recursive: true });
  const journalPath = path.join(folder, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: { tag: string }[] };
  const last = journal.entries.findIndex((entry) => entry.tag === tag);
  writeFileSync(journalPath, JSON.stringify({ ...journal, entries: journal.entries.slice(0, last + 1) }));
  return folder;
}

async function rows(client: PGlite, query: string, params: unknown[] = []): Promise<Row[]> {
  return (await client.query<Row>(query, params)).rows;
}

async function insertOldStatuses(client: PGlite, userId: string): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const [group, name, color, position, systemKey] of OLD_STATUSES) {
    const [row] = await rows(
      client,
      `insert into "status" ("user_id", "status_group", "name", "color", "position", "system_key")
       values ($1, $2, $3, $4, $5, $6) returning "id"`,
      [userId, group, name, color, position, systemKey],
    );
    ids.set(systemKey, String(row.id));
  }

  return ids;
}

async function insertGame(client: PGlite, userId: string, title: string, statusId: string, extra: Row = {}): Promise<string> {
  const [catalog] = await rows(client, `insert into "catalog_game" ("source", "title") values ('igdb', $1) returning "id"`, [title]);
  const [game] = await rows(
    client,
    `insert into "library_game" ("user_id", "catalog_game_id", "status_id", "status_since", "not_interested")
     values ($1, $2, $3, '2025-03-10', $4) returning "id"`,
    [userId, catalog.id, statusId, extra.notInterested ?? false],
  );
  return String(game.id);
}

describe("paso a los estados nuevos", () => {
  let client: PGlite;
  let before: string;
  const ids: Record<string, string> = {};
  let statusesA: Map<string, string>;
  let statusesB: Map<string, string>;

  beforeAll(async () => {
    client = new PGlite();
    await client.exec(SUPABASE_ROLES.map((role) => `create role ${role} nologin;`).join("\n"));
    before = migrationsUpTo(LAST_BEFORE);
    await migrate(drizzle({ client }), { migrationsFolder: before });

    statusesA = await insertOldStatuses(client, USER_A);
    statusesB = await insertOldStatuses(client, USER_B);
    // B renombró «Pendiente»: conserva su nombre.
    await client.query(`update "status" set "name" = 'Algún día' where "user_id" = $1 and "system_key" = 'backlog'`, [USER_B]);

    ids.overwatch = await insertGame(client, USER_A, "Overwatch", statusesA.get("endless") ?? "");
    ids.hades = await insertGame(client, USER_A, "Hades", statusesA.get("backlog") ?? "");
    ids.beholder = await insertGame(client, USER_A, "Beholder", statusesA.get("backlog") ?? "", { notInterested: true });
    ids.rocket = await insertGame(client, USER_B, "Rocket League", statusesB.get("endless") ?? "");
    await client.query(
      `insert into "journal_entry" ("user_id", "library_game_id", "kind", "occurred_on", "from_status_id", "to_status_id")
       values ($1, $2, 'status_change', '2025-03-10', $3, $4), ($1, $2, 'status_change', '2025-01-02', $5, $4)`,
      [USER_A, ids.overwatch, statusesA.get("playing"), statusesA.get("endless"), statusesA.get("wishlist")],
    );
    const [entry] = await rows(
      client,
      `insert into "import_entry" ("user_id", "status_key", "play_answer") values ($1, 'endless', 'not_interested') returning "id"`,
      [USER_A],
    );
    ids.entryEndless = String(entry.id);
    const [other] = await rows(client, `insert into "import_entry" ("user_id", "status_key") values ($1, 'completed') returning "id"`, [USER_A]);
    ids.entryCompleted = String(other.id);

    await migrate(drizzle({ client }), { migrationsFolder: MIGRATIONS });
  });

  afterAll(async () => {
    await client.close();
    rmSync(before, { recursive: true, force: true });
  });

  async function gameOf(gameId: string): Promise<Row> {
    const [game] = await rows(
      client,
      `select "s"."system_key", "lg"."endless", "lg"."hidden", "lg"."status_since"::text as "since"
       from "library_game" "lg" join "status" "s" on "s"."id" = "lg"."status_id" where "lg"."id" = $1`,
      [gameId],
    );
    return game;
  }

  it("Juego en «Sin fin»", async () => {
    const game = await gameOf(ids.overwatch);

    const journal = await rows(
      client,
      `select "f"."system_key" as "from", "t"."system_key" as "to" from "journal_entry" "je"
       join "status" "f" on "f"."id" = "je"."from_status_id" join "status" "t" on "t"."id" = "je"."to_status_id"
       where "je"."library_game_id" = $1 order by "je"."occurred_on"`,
      [ids.overwatch],
    );
    expect(game).toEqual({ system_key: "played", endless: true, hidden: false, since: "2025-03-10" });
    expect(journal).toEqual([
      { from: "wishlist", to: "played" },
      { from: "playing", to: "played" },
    ]);
  });

  it("Juego en «Pendiente»", async () => {
    const game = await gameOf(ids.hades);

    const [backlog] = await rows(client, `select "name" from "status" where "user_id" = $1 and "system_key" = 'backlog'`, [USER_A]);
    expect(game).toMatchObject({ system_key: "backlog", since: "2025-03-10" });
    expect(backlog.name).toBe("Backlog");
  });

  it("un «Pendiente» renombrado conserva su nombre", async () => {
    const [backlog] = await rows(client, `select "name" from "status" where "user_id" = $1 and "system_key" = 'backlog'`, [USER_B]);

    expect(backlog.name).toBe("Algún día");
  });

  it("el estado «Sin fin» deja de existir para todos los usuarios", async () => {
    const left = await rows(client, `select "id" from "status" where "system_key" = 'endless'`);

    const counts = await rows(client, `select "user_id", count(*)::int as "count" from "status" group by "user_id" order by "user_id"`);
    expect(left).toEqual([]);
    expect(counts.map(({ count }) => count)).toEqual([OLD_STATUSES.length - 1, OLD_STATUSES.length - 1]);
  });

  it("los juegos de cada usuario pasan a su propio «Jugado»", async () => {
    const [rocket] = await rows(client, `select "status_id" from "library_game" where "id" = $1`, [ids.rocket]);

    expect(rocket.status_id).toBe(statusesB.get("played"));
  });

  it("un juego «Sin interés» queda oculto", async () => {
    const game = await gameOf(ids.beholder);

    expect(game).toMatchObject({ system_key: "backlog", hidden: true });
  });

  it("el paso no suma registros al diario", async () => {
    const [{ count }] = await rows(client, `select count(*)::int as "count" from "journal_entry"`);

    expect(count).toBe(2);
  });

  it("una revisión abierta pasa sus respuestas al estado por id y a «oculto»", async () => {
    const entries = await rows(client, `select "id", "status_id", "endless_answer", "play_answer" from "import_entry" order by "status_id"`);

    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    expect(byId.get(ids.entryEndless)).toMatchObject({ status_id: statusesA.get("played"), endless_answer: true, play_answer: "hidden" });
    expect(byId.get(ids.entryCompleted)).toMatchObject({ status_id: statusesA.get("completed"), endless_answer: null });
  });
});
